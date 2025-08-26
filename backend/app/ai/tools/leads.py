from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from app.db.db import fetch as pg_fetch
from app.ai import OPENAI_API_KEY, GEMINI_API_KEY, ACTIVE_MODEL, OPENAI_MODEL, GEMINI_MODEL

def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    """Best-effort extraction of a single JSON object from free-form text.
    - Strips markdown code fences
    - Finds first balanced {...} block
    - Returns parsed dict or None
    """
    import json

    if not text:
        return None

    cleaned = text.strip()
    # Remove common markdown fences
    if cleaned.startswith("```json"):
        cleaned = cleaned[len("```json"):]
    if cleaned.startswith("```"):
        cleaned = cleaned[len("```"):]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # If it's already a single JSON object
    if cleaned.startswith("{") and cleaned.endswith("}"):
        try:
            return json.loads(cleaned)
        except Exception:
            pass

    # Scan for first balanced JSON object
    start_idx = cleaned.find("{")
    while start_idx != -1:
        depth = 0
        for i in range(start_idx, len(cleaned)):
            ch = cleaned[i]
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    candidate = cleaned[start_idx:i+1]
                    try:
                        return json.loads(candidate)
                    except Exception:
                        break
        start_idx = cleaned.find("{", start_idx + 1)
    return None


class LeadLite(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    campus: Optional[str] = None
    course: Optional[str] = None
    lead_score: float = 0.0
    last_activity_at: Optional[datetime] = None


async def sql_query_leads(filters: Dict[str, Any]) -> List[LeadLite]:
    """
    Read-only, whitelisted query into a view for leads management.
    Applies an automatic LIMIT and optional campus/course/stalled filters.
    """
    base = [
        "SELECT id::text as id,",
        "trim(coalesce(first_name,'')||' '||coalesce(last_name,'')) as name,",
        "email, NULL::text as campus, NULL::text as course,",
        "coalesce(lead_score,0) as lead_score, created_at as last_activity_at",
        "FROM vw_leads_management",
        "WHERE 1=1",
    ]
    params: List[Any] = []

    # Campus and course not present in vw_leads_management; omit for now

    stalled = filters.get("stalled_days_gte")
    if stalled:
        base.append(
            "AND now() - created_at >= (%s || ' days')::interval"
        )
        params.append(int(stalled))

    base.append("ORDER BY created_at DESC LIMIT 500")
    sql = "\n".join(base)
    rows = await pg_fetch(sql, *params)
    return [LeadLite(**r) for r in rows]


class TriageItem(BaseModel):
    id: str
    score: float
    reasons: List[str]
    next_action: str


def _rule_score(lead: LeadLite) -> tuple[float, List[str], str]:
    reasons: List[str] = []
    score = 0.0
    
    # Lead score contribution (40% of total)
    if lead.lead_score:
        score += min(lead.lead_score, 100) * 0.4
        if lead.lead_score >= 80:
            reasons.append("High lead score (80+)")
        elif lead.lead_score >= 60:
            reasons.append("Good lead score (60+)")
        elif lead.lead_score >= 40:
            reasons.append("Moderate lead score (40+)")
    
    # Recency bonus (30% of total)
    if lead.last_activity_at:
        # Handle timezone-aware vs naive datetime comparison
        if lead.last_activity_at.tzinfo is None:
            # If naive, assume UTC
            activity_time = lead.last_activity_at.replace(tzinfo=timezone.utc)
        else:
            activity_time = lead.last_activity_at
        
        now = datetime.now(timezone.utc)
        days_ago = (now - activity_time).days
        
        if days_ago <= 1:
            score += 30
            reasons.append("Very recent activity")
        elif days_ago <= 7:
            score += 20
            reasons.append("Recent activity (within week)")
        elif days_ago <= 30:
            score += 10
            reasons.append("Recent activity (within month)")
    else:
        score += 5
        reasons.append("No recent activity")
    
    # Engagement bonus (20% of total)
    if lead.email:
        score += 10
        reasons.append("Has email contact")
    
    # Course interest bonus (10% of total)
    if lead.course and lead.course != "Unknown":
        score += 10
        reasons.append("Specific course interest")
    
    # Normalize to 0-100 scale
    score = min(100.0, max(0.0, score))
    
    # Determine next best action
    if score >= 80:
        next_action = "Schedule interview immediately"
    elif score >= 60:
        next_action = "Send personalized follow-up"
    elif score >= 40:
        next_action = "Nurture with course information"
    else:
        next_action = "Send general information"
    
    return score, reasons, next_action


async def leads_triage(items: List[LeadLite]) -> List[Dict[str, Any]]:
    """
    Hybrid rules + LLM re-rank & explanation via LangChain. Supports both OpenAI and Gemini.
    """
    # Compute deterministic base scores
    base: List[Dict[str, Any]] = []
    for l in items:
        score, reasons, next_action = _rule_score(l)
        base.append({"id": l.id, "score": score, "reasons": reasons, "next_action": next_action})
    if not base:
        return []

    # If no AI models available, return normalized rules-only ranking
    if ACTIVE_MODEL == "none":
        max_score = max(x["score"] for x in base) or 1.0
        for x in base:
            x["score"] = round((x["score"] / max_score) * 100.0, 1)
        return sorted(base, key=lambda x: x["score"], reverse=True)

    # Prepare LLM based on available model
    try:
        if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.2, api_key=OPENAI_API_KEY)
            print(f"🤖 Using OpenAI model: {OPENAI_MODEL}")
        elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=0.2,
                google_api_key=GEMINI_API_KEY
            )
            print(f"🤖 Using Gemini model: {GEMINI_MODEL}")
        else:
            raise Exception(f"No valid AI model available. Active: {ACTIVE_MODEL}")

        from langchain_core.prompts import ChatPromptTemplate
        from pathlib import Path
        
        schema = Path(__file__).resolve().parents[1] / "schema" / "LEADS_SCHEMA.md"
        triage_prompt_path = Path(__file__).resolve().parents[1] / "prompts" / "leads_triage.md"
        
        if not schema.exists() or not triage_prompt_path.exists():
            print("⚠️  Prompt files not found, using rules-only fallback")
            raise Exception("Prompt files missing")
            
        schema_text = schema.read_text(encoding="utf-8")
        prompt_text = triage_prompt_path.read_text(encoding="utf-8")
        prompt = ChatPromptTemplate.from_template(prompt_text)

        features = [
            {
                "id": x["id"],
                "lead_score": next((l.lead_score for l in items if l.id == x["id"]), 0),
                "last_activity_at": next((l.last_activity_at.isoformat() if l.last_activity_at else None for l in items if l.id == x["id"]), None),
            }
            for x in base
        ]
        
        messages = prompt.format_messages(schema=schema_text, leads=json.dumps(features))
        resp = await llm.ainvoke(messages)
        text = resp.content if hasattr(resp, "content") else str(resp)
        
        try:
            parsed = json.loads(text)
            # Ensure required fields and coerce scoring range
            for it in parsed:
                if "score" in it:
                    s = float(it["score"]) if it["score"] is not None else 0.0
                    it["score"] = max(0.0, min(100.0, round(s, 1)))
                it.setdefault("reasons", [])
                it.setdefault("next_action", "follow_up")
            # Fallback merge with base if ids missing
            by_id = {it["id"]: it for it in parsed if it.get("id") is not None}
            merged = []
            for b in base:
                merged.append(by_id.get(b["id"], {**b, "score": round((b["score"]/max(1.0, max(x["score"] for x in base)))*100.0, 1)}))
            return sorted(merged, key=lambda x: x["score"], reverse=True)
        except Exception as e:
            print(f"⚠️  JSON parsing failed: {e}, using rules-only fallback")
            raise e
            
    except Exception as e:
        print(f"⚠️  AI model failed: {e}, using rules-only fallback")
        # Fallback to rules-only if AI fails
        max_score = max(x["score"] for x in base) or 1.0
        for x in base:
            x["score"] = round((x["score"] / max_score) * 100.0, 1)
        return sorted(base, key=lambda x: x["score"], reverse=True)


class EmailDraftModel(BaseModel):
    subject: str
    body: str
    merge_fields: List[str] = ["first_name"]


async def compose_outreach(leads: List[LeadLite], intent: str, user_prompt: Optional[str] = None, content: Optional[str] = None) -> Dict[str, Any]:
    """Compose an outreach email using AI (OpenAI or Gemini), with JSON output contract."""

    if ACTIVE_MODEL == "none":
        first = leads[0] if leads else None
        subject = {
            "book_interview": "Next step: schedule your interview",
            "nurture": "Quick update from Bridge",
            "reengage": "Checking in – still interested?",
            "grammar_check": "Grammar check completed",
            "custom": "Custom email assistance"
        }.get(intent, "Hello from Bridge")
        greeting = f"Hi {first.name.split(' ')[0] if first and first.name else 'there'},"
        body = f"{greeting}\n\nWe'd love to help you take the next step."
        return {"subject": subject, "body": body, "merge_fields": ["first_name"]}

    try:
        # Base LLMs
        if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.4, api_key=OPENAI_API_KEY)
            print(f"🤖 Composing email with OpenAI: {OPENAI_MODEL}")
        elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=0.4,
                google_api_key=GEMINI_API_KEY
            )
            print(f"🤖 Composing email with Gemini: {GEMINI_MODEL}")
        else:
            raise Exception(f"No valid AI model available. Active: {ACTIVE_MODEL}")

        from langchain_core.prompts import ChatPromptTemplate
        from pathlib import Path
        import json

        schema = Path(__file__).resolve().parents[1] / "schema" / "LEADS_SCHEMA.md"
        prompt_path = Path(__file__).resolve().parents[1] / "prompts" / "outreach_compose.md"

        if not schema.exists() or not prompt_path.exists():
            print("⚠️  Prompt files not found, using template fallback")
            raise Exception("Prompt files missing")

        schema_text = schema.read_text(encoding="utf-8")
        prompt_text = prompt_path.read_text(encoding="utf-8")
        prompt = ChatPromptTemplate.from_template(prompt_text)

        leads_summary = ", ".join([l.name for l in leads[:3]]) + (" and others" if len(leads) > 3 else "")

        inputs: Dict[str, Any] = {"schema": schema_text, "intent": intent, "leads_summary": leads_summary}
        # Always include optional fields, using empty strings if not provided
        inputs["user_prompt"] = user_prompt or ""
        inputs["content"] = content or ""

        # Enforce structured JSON output
        llm_structured = llm.with_structured_output(EmailDraftModel)
        
        chain = prompt | llm_structured
        draft: EmailDraftModel = await chain.ainvoke(inputs)
        return draft.model_dump()

    except Exception as e:
        print(f"⚠️  AI composition failed: {e}, using template fallback")
        first = leads[0] if leads else None
        subject = {
            "book_interview": "Next step: schedule your interview",
            "nurture": "Quick update from Bridge",
            "reengage": "Checking in – still interested?",
            "grammar_check": "Grammar check completed",
            "custom": "Custom email assistance"
        }.get(intent, "Hello from Bridge")
        greeting = f"Hi {first.name.split(' ')[0] if first and first.name else 'there'},"
        body = f"{greeting}\n\nWe'd love to help you take the next step."
        return {"subject": subject, "body": body, "merge_fields": ["first_name"]}


