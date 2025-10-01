"""
RAG (Retrieval-Augmented Generation) API Router
Provides intelligent query processing with vector search and knowledge base integration
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
import json
import uuid
import asyncio
import logging

from app.db.db import fetch, fetchrow, execute
from app.ai.natural_language import interpret_natural_language_query, execute_lead_query
from app.ai.runtime import narrate
from app.ai.actions import normalise_actions
from app.ai.privacy_utils import safe_preview
from app.ai.cache import CACHE, make_key
from app.ai import AI_TIMEOUT_HELPER_MS, AI_TIMEOUT_MAIN_MS, IVY_ORGANIC_ENABLED
from app.ai.ui_models import IvyConversationalResponse, MaybeModal
from app.ai.actions import normalise_actions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])

# ───────────────────────── Helper Functions ─────────────────────────

def build_situation_context(context: Optional[Dict[str, Any]]) -> str:
    """Build situational hints from context for better AI responses"""
    if not context: return ""
    lead = context.get("lead", {}) or {}
    call = context.get("call", {}) or {}
    hints = [
        f"tone={call.get('tone','neutral')}",
        f"urgency={call.get('urgency','normal')}",
        f"channel={call.get('channel','phone')}",
        f"stage={lead.get('status','unknown')}",
        f"budget_sensitivity={lead.get('budgetSensitivity','unknown')}",
        f"objection={(call.get('last_objection') or 'none')[:80]}",
        f"deadline={lead.get('deadline','unknown')}",
        f"region={lead.get('region','UK')}",
    ]
    return "SITUATION HINTS: " + ", ".join(hints) + "\n"

async def log_rag_query(
    *,
    query_text: str,
    query_type: str,
    context: Dict[str, Any],
    retrieved_documents: List[Any],
    response_text: str,
    session_id: str,
    lead_id: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """PII-safe logging for RAG analytics. Best-effort, never raises.

    Stores only previews and IDs; never raw emails/phones or full free-text bodies.
    """
    try:
        lead_preview = safe_preview((context or {}).get("lead", {})) if context else {}
        trace = {
            "session_id": session_id,
            "lead_id": lead_id,
            "query_type": query_type,
            "lead_preview": lead_preview,
            "retrieved_doc_ids": retrieved_documents[:10],
            "answer_len": len(response_text or ""),
            "ts": datetime.utcnow().isoformat() + "Z",
        }
        if meta:
            trace.update(meta)
        logger.info("RAG trace: %s", trace)
    except Exception as e:
        logger.warning("Failed to log RAG trace: %s", e)

def _make_email_json_fallback(context: Dict[str, Any]) -> str:
    """Minimal subject/body JSON using person context as fallback."""
    lead = (context or {}).get("lead", {}) or {}
    name = lead.get("name", "there")
    course = lead.get("courseInterest") or lead.get("latest_programme_name") or "your course"
    subject = f"Quick next step for {course}"
    body = (
        f"Dear {name},\n\n"
        f"Great to speak about {course}. Based on what we have so far, the simplest next step is to confirm your entry requirements and timeline."
        f" If you like, I can send a short checklist or book a quick 1–1.\n\n"
        f"Best wishes,\nIvy"
    )
    import json as _json
    return _json.dumps({"subject": subject, "body": body})

async def _generate_json_tool_response(query: str, context: Dict[str, Any], knowledge_results: List[Dict[str, Any]]) -> str:
    """Generate strict JSON for tools (e.g., email composer). Returns a JSON string.

    If generation fails or times out, returns a minimal fallback JSON.
    """
    try:
        from app.ai.safe_llm import LLMCtx
        # Detect type hint from query: expects {"type":"email"|"note"}
        _type = None
        try:
            hint = json.loads(query) if query.strip().startswith('{') else None
            if isinstance(hint, dict):
                _type = (hint.get("type") or "").strip().lower()
        except Exception:
            _type = None

        sys = (
            "Return ONLY valid JSON. For type 'email' return {\"subject\": string, \"body\": string}. "
            "For type 'note' return {\"subject\": string, \"body\": string} suitable for a CRM note.")
        # Build a compact guidance snapshot
        lead = (context or {}).get("lead", {}) or {}
        facts = {
            "name": lead.get("name"),
            "course": lead.get("courseInterest") or lead.get("latest_programme_name"),
            "status": lead.get("status") or lead.get("statusType"),
        }
        kb_titles = [r.get("title") for r in (knowledge_results or [])[:3] if r.get("title")]
        human = (
            f"Tool type: {_type or 'email'}\n"
            f"Tool request: {query}\n\n"
            f"Person: {facts}\n"
            f"Top sources: {kb_titles}"
        )
        llm = LLMCtx(temperature=0.4, timeout_ms=AI_TIMEOUT_HELPER_MS)
        out = await llm.ainvoke([("system", sys), ("human", human)])
        text = (out or "").strip()
        # Ensure it's valid JSON; if not, fallback
        import json as _json
        # Validate and coerce keys to strings
        data = _json.loads(text)
        if isinstance(data, dict):
            # Ensure all keys are strings (defensive for odd SDK updates)
            data = {str(k): v for k, v in data.items()}
            text = _json.dumps(data)
        return text
    except Exception:
        return _make_email_json_fallback(context)

def maybe_anonymise(content: str, anonymise: bool = False) -> str:
    """Selective anonymisation using privacy_utils.anonymise_body preserving [S#] lines."""
    if not anonymise:
        return content
    from app.ai.privacy_utils import anonymise_body
    return anonymise_body(content, True)


def _unsafe_topics_present(q: str) -> bool:
    """Check if risky topics are present in query"""
    # only allow these if *already* in the user query
    risky = {"islam","islamic","jihad","palestine","israel","russia","ukraine"}
    import re
    wl = set(re.findall(r"[a-z]+", q.lower()))
    return any(t in wl for t in risky)

async def multi_query_expansions(q: str, ctx: Optional[Dict[str,Any]] = None) -> List[str]:
    """Generate multiple query variations for better retrieval with drift protection"""
    name = _extract_person_name(q, ctx)
    risky_in_user = _unsafe_topics_present(q)

    # If asking about a specific person, pin expansions to that intent.
    if name:
        base = [
            q,
            f"Details about {name} relevant to admissions and course interest",
            f"What to ask and say when speaking with {name} now",
            f"Next steps for {name} based on status and timeline"
        ]
        return base

    # Otherwise, use LLM expansions but post-filter out risky drift
    try:
        from app.ai import ACTIVE_MODEL, OPENAI_API_KEY, OPENAI_MODEL, GEMINI_API_KEY, GEMINI_MODEL
        from app.ai.safe_llm import LLMCtx
        llm = LLMCtx(temperature=0.4)

        prompt = (
          "Rewrite the UK admissions/helpdesk question into 3 semantically different "
          "search queries (≤12 words each). Keep topic and entities the same. "
          "Do NOT introduce new subjects or religions not present in the question.\n\nQ: " + q
        )
        out = await llm.ainvoke(prompt)
        cand = [l.strip("•- ").strip() for l in (out or "").splitlines() if l.strip()]
        keep = []
        for c in cand:
            # block risky subjects unless already in user query
            if not risky_in_user and _unsafe_topics_present(c):
                continue
            keep.append(c)
        uniq = [q]
        for c in keep:
            if c and c.lower() not in [x.lower() for x in uniq]:
                uniq.append(c)
        return uniq[:4] if len(uniq)>1 else [q]
    except Exception:
        return [q]

def _cos_sim(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors"""
    import math
    dot = sum(x*y for x,y in zip(a,b))
    na = math.sqrt(sum(x*x for x in a)) or 1e-9
    nb = math.sqrt(sum(x*x for x in b)) or 1e-9
    return dot/(na*nb)

def _canon_title(t: str) -> str:
    """Canonicalize title for deduplication."""
    import re
    t = (t or "").lower()
    t = re.sub(r"\s+", " ", t)
    return re.sub(r"[^\w\s]", "", t).strip()

def _overlap(a: str, b: str) -> float:
    """Calculate overlap ratio between two text snippets."""
    import difflib
    return difflib.SequenceMatcher(None, a[:180], b[:180]).ratio()

def dedupe_passages(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicate results by passage content hash with title canonicalization and snippet overlap."""
    import hashlib
    seen_hashes = set()
    out = []
    
    for r in results:
        content = str(r.get("content", ""))
        title = _canon_title(r.get("title", ""))
        
        # Create hash from canonicalized title + content
        key = hashlib.sha1((title + content[:200]).encode("utf-8")).hexdigest()
        
        if key not in seen_hashes:
            # Check for snippet overlap with already selected results
            content_snippet = content[:180]
            has_overlap = False
            for existing in out:
                existing_snippet = str(existing.get("content", ""))[:180]
                if _overlap(content_snippet, existing_snippet) > 0.6:
                    has_overlap = True
                    break
            
            if not has_overlap:
                out.append(r)
                seen_hashes.add(key)
    
    return out

def mmr_select(query_vec: List[float], candidates: List[Dict[str,Any]], k: int = 5, lambda_=0.7) -> List[Dict[str,Any]]:
    """Maximal Marginal Relevance selection with light category diversity and dedupe by title/id."""
    # First dedupe by passage content
    candidates = dedupe_passages(candidates)
    
    # Deduplicate by id then by normalized title
    seen_ids = set()
    seen_titles = set()
    uniq: List[Dict[str, Any]] = []
    for c in candidates:
        cid = c.get("id")
        title = str(c.get("title", "")).strip().lower()
        if cid in seen_ids or (title and title in seen_titles):
            continue
        seen_ids.add(cid)
        if title:
            seen_titles.add(title)
        uniq.append(c)

    selected: List[Dict[str, Any]] = []
    while uniq and len(selected) < k:
        best, best_score = None, -1e9
        for c in uniq:
            rel = float(c.get("similarity_score", c.get("rank_score", 0.5)))
            div = 0.0
            if selected:
                # Penalize same category to encourage diversity (>2 docs from same category)
                cat = (c.get("category") or "").lower()
                same_cat = sum(1 for s in selected if (s.get("category") or "").lower() == cat and cat)
                cat_penalty = 0.15 * max(0, same_cat - 1)  # Penalty kicks in after 2 docs
                # Also use score dispersion for general diversity
                disp = max(abs(rel - float(s.get("similarity_score", s.get("rank_score", 0.5)))) for s in selected)
                div = disp + cat_penalty
            score = lambda_ * rel - (1 - lambda_) * div
            if score > best_score:
                best = c; best_score = score
        selected.append(best)
        uniq.remove(best)
    return selected

def make_sources_block(results: List[Dict[str,Any]], limit: int = 4) -> str:
    """Format knowledge results as source blocks with citations"""
    from textwrap import shorten
    lines = []
    for i, r in enumerate(results[:limit], 1):
        title = r.get("title","Untitled")
        cat = r.get("category") or ""
        dt = r.get("document_type") or ""
        excerpt = shorten(r.get("content","").strip(), 800, placeholder="…")
        lines.append(f"[S{i}] {title} — {cat}/{dt}\n{excerpt}")
    return "\n\n".join(lines)

def adaptive_confidence(top_scores: List[float]) -> float:
    """Calculate adaptive confidence based on retrieval quality"""
    if not top_scores: return 0.5
    s1 = top_scores[0]
    mean3 = sum(top_scores[:3]) / min(len(top_scores),3)
    if s1 >= 0.72: return 0.92
    if mean3 >= 0.62: return 0.85
    if mean3 >= 0.52: return 0.75
    return 0.6

import re

def is_profile_query(q: str) -> bool:
    ql = q.lower().strip()
    pats = [r"\btell me about\b", r"\bwho is\b", r"\bprofile\b", r"\bwhat do we know\b", r"\bsummar(y|ise)\b"]
    return any(re.search(p, ql) for p in pats)

def _mentions_this_person(ql: str) -> bool:
    return ("this person" in ql) or ("this specific person" in ql) or ("this lead" in ql)

def _extract_person_name(query: str, ctx: Optional[Dict[str,Any]]) -> Optional[str]:
    """Extract person name from query or context"""
    # Try to get from context first
    if ctx and ctx.get("lead") and ctx["lead"].get("name"):
        return ctx["lead"]["name"]
    
    # Simple extraction from query (look for "tell me about [name]")
    import re
    match = re.search(r"\b(?:about|is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", query)
    if match:
        return match.group(1)
    
    return None

def classify_suggestions_intent(query: str) -> str:
    """Classify query intent for suggestions modal"""
    ql = query.lower().strip()
    
    # Intent routing based on patterns
    if any(pattern in ql for pattern in ["tell me about", "what do we know", "who is"]):
        return "lead_profile"
    elif any(pattern in ql for pattern in ["likelihood", "probability", "convert", "chance"]):
        return "conversion_forecast"
    elif any(pattern in ql for pattern in ["attend", "book"]) and any(pattern in ql for pattern in ["1-1", "one to one", "meeting", "call"]):
        return "attendance_willingness"
    elif any(pattern in ql for pattern in ["next best action", "what should i do", "nba"]):
        return "next_best_action"
    elif any(pattern in ql for pattern in ["risk", "red flag", "stall", "concern"]):
        return "risk_check"
    elif any(pattern in ql for pattern in ["source", "where did they come from", "lead quality"]):
        return "source_quality"
    else:
        return "general_help"

async def classify_intent(query: str, ctx: Optional[Dict[str,Any]] = None) -> str:
    """Classify query intent using LLM with person context awareness"""
    ql = query.lower()
    
    # NEW: if it's a profile-y phrasing AND we can extract a name, treat as profile
    if is_profile_query(query) and _extract_person_name(query, ctx):
        return "lead_profile"
    
    # prefer context if we actually have a lead or "this (specific) person"
    if (ctx or {}).get("lead") or _mentions_this_person(ql):
        if is_profile_query(query):    # <<< already present
            return "lead_profile"
        if any(k in ql for k in ["objection","concern"]): return "objection_handling"
        if any(k in ql for k in ["summary","summarise","recap"]): return "call_summary"
        # Check for admissions decision queries
        if re.search(r"\b(offer|make)\s+(them\s+)?(an?\s+)?offer\b", ql) or "offer a place" in ql:
            return "admissions_decision"
        return "lead_info"
    
    # Otherwise use LLM classification
    try:
        from app.ai import ACTIVE_MODEL, OPENAI_API_KEY, OPENAI_MODEL, GEMINI_API_KEY, GEMINI_MODEL
        from app.ai.safe_llm import LLMCtx
        llm = LLMCtx(temperature=0)
        sys = "Return ONLY JSON: {\"type\": one of [\"sales_strategy\",\"course_info\",\"lead_info\",\"objection_handling\",\"call_summary\",\"general_query\"]}"
        human = f"Classify this UK HE admissions assistant query: {query}"
        out = await llm.ainvoke([("system", sys), ("human", human)])
        import json as _json
        
        # Extract JSON from response (some providers prepend prose)
        content = out.strip()
        json_match = re.search(r'\{[\s\S]*?"type"[\s\S]*?\}', content)
        try:
            if json_match:
                return _json.loads(json_match.group()).get("type", "general_query")
            else:
                return _json.loads(content).get("type", "general_query")
        except _json.JSONDecodeError:
            # If JSON parsing fails, fall back to keyword matching
            pass
    except Exception:
        # Conservative fallback
        if any(k in ql for k in ["sell","sales","strategy","approach"]): return "sales_strategy"
        if any(k in ql for k in ["course","programme","curriculum"]): return "course_info"
        if any(k in ql for k in ["lead","this person","student"]): return "lead_info"
        if any(k in ql for k in ["objection","concern","problem"]): return "objection_handling"
        if any(k in ql for k in ["summary","summarise","recap","wrap up"]): return "call_summary"
        return "general_query"


def _num(x):
    try:
        return float(x)
    except Exception:
        return None

def make_person_source(ctx: Optional[Dict[str,Any]]) -> Optional[Dict[str,Any]]:
    """Create synthetic person source from context.lead for grounding"""
    lead = (ctx or {}).get("lead") or {}
    if not lead: 
        logger.info(f"No lead data in context: {ctx}")
        return None
    
    logger.info(f"Creating person source (preview): {safe_preview(lead)}")
    
    ai = lead.get("aiInsights") or (ctx or {}).get("ai") or {}
    conv = _num(ai.get("conversionProbability"))
    eta  = ai.get("etaDays") or ai.get("eta_days")
    nba  = ai.get("recommendedAction") or ai.get("callStrategy") or lead.get("nextAction")
    
    # Ensure conversionProbability is numeric in ai object for downstream use
    if conv is not None:
        try:
            conv = max(0.0, min(1.0, float(conv)))
            ai["conversionProbability"] = conv
        except Exception:
            ai.pop("conversionProbability", None)

    lines = []
    add = lambda k,v: lines.append(f"{k}: {v}") if v not in (None,"","N/A") else None
    add("Name", lead.get("name"))
    add("Email", lead.get("email"))
    add("Phone", lead.get("phone"))
    add("Status", lead.get("status") or lead.get("statusType"))
    add("Course Interest", lead.get("courseInterest") or lead.get("latest_programme_name"))
    add("Next Action", lead.get("nextAction") or nba)
    add("Follow-up", lead.get("followUpDate"))
    if conv is not None: add("Conversion Probability", f"{conv:.2f}")
    if eta is not None:  add("ETA (days)", eta)

    content = "\n".join(lines) or "No enriched fields available."
    return {
        "id": "person_ctx",
        "title": "Person Context (Live Lead)",
        "content": content,
        "document_type": "context",
        "category": "lead",
        "similarity_score": 1.0,
        "rank_score": 1.0
    }

async def generate_person_answer(query: str, knowledge_results: List[Dict[str,Any]], context: Optional[Dict[str,Any]]) -> str:
    """Generate person-focused answer for lead_info queries"""
    
    # Early guard for untracked personal questions
    ql = (query or "").lower()
    
    # Skip privacy guard for APEL-related queries
    if "apel" not in ql:
        import re
        personal_untracked = ["dog","cat","pet","married","boyfriend","girlfriend","religion","political","political views"]
        if any(re.search(rf'\b{w}\b', ql) for w in personal_untracked):
            from app.ai.text_sanitiser import cleanse_conversational
            return cleanse_conversational(
                "We don't record personal details like that. Let's focus on the course fit, entry requirements, and the next sensible step."
            )
    
    # If it's clearly a profile-y question, delegate to the profile generator
    if is_profile_query(query):
        return await generate_person_profile(query, context)
    
    try:
        # Conversational mode: use organic narrator for a concise, grounded answer
        if IVY_ORGANIC_ENABLED:
            lead = (context or {}).get("lead", {})
            # Build a flat preview plus a few derived facts for the narrator
            from app.ai.privacy_utils import safe_preview as _safe_preview
            preview = _safe_preview(lead) if lead else {}
            if lead.get("name"):
                preview["name"] = lead.get("name")
            if lead.get("courseInterest") or lead.get("latest_programme_name"):
                preview["courseInterest"] = lead.get("courseInterest") or lead.get("latest_programme_name")
            if lead.get("status") or lead.get("statusType"):
                status_value = lead.get("status") or lead.get("statusType")
                if isinstance(status_value, str) and status_value.lower() == "lead":
                    preview["status"] = "enquirer"
                else:
                    preview["status"] = status_value
            if lead.get("touchpoint_count") is not None:
                preview["touchpoint_count"] = lead.get("touchpoint_count")
            if lead.get("last_engagement_date"):
                preview["last_engagement_date"] = lead.get("last_engagement_date")
            result = await narrate(query, person=preview, kb_sources=knowledge_results, intent="lead_info")
            return result["text"]

        # Fallback legacy structure when organic disabled
        from app.ai import ACTIVE_MODEL, GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL
        from app.ai.safe_llm import LLMCtx
        llm = LLMCtx(temperature=0.3, timeout_ms=AI_TIMEOUT_MAIN_MS)
        situation_context = build_situation_context(context)
        person_src = make_person_source(context)
        kb_for_prompt = ([person_src] if person_src else []) + knowledge_results
        sources_block = make_sources_block(kb_for_prompt)
        SYSTEM = "You are Ivy. British English. Be concise and actionable."
        HUMAN = f"""Query: {query}

{situation_context}Sources:
{sources_block}
"""
        return await llm.ainvoke([("system", SYSTEM), ("human", HUMAN)])
    except Exception as e:
        logger.error(f"Person-focused answer generation failed: {e}")
        return generate_fallback_lead_answer(query, knowledge_results, context)

def generate_fallback_lead_answer(query: str, knowledge_results: List[Dict[str,Any]], context: Optional[Dict[str,Any]]) -> str:
    """Fallback person-focused answer when AI is unavailable"""
    lead = (context or {}).get("lead", {})
    lead_name = lead.get("name", "this person")
    
    response = f"**What You Know about {lead_name}:**\n\n"
    
    # Show key person data
    if lead.get("email"):
        response += f"• **Contact**: {lead.get('email')}"
        if lead.get("phone"):
            response += f" | {lead.get('phone')}"
        response += "\n"
    
    if lead.get("courseInterest"):
        response += f"• **Course Interest**: {lead.get('courseInterest')}\n"
    
    if lead.get("statusType"):
        response += f"• **Status**: {lead.get('statusType')}\n"
    
    if lead.get("nextAction"):
        response += f"• **Next Action**: {lead.get('nextAction')}\n"
    
    if lead.get("aiInsights", {}).get("conversionProbability"):
        prob = lead.get("aiInsights", {}).get("conversionProbability")
        if isinstance(prob, (int, float)):
            response += f"• **Conversion Probability**: {int(prob * 100)}%\n"
    
    response += "\n**Ask:**\n"
    if not lead.get("courseInterest"):
        response += f"• 'Hi {lead_name}, which course are you interested in?'\n"
    if not lead.get("statusType"):
        response += f"• 'What stage are you at in your application process?'\n"
    response += f"• 'What questions do you have about the course or application?'\n"
    
    response += "\n**Say:**\n"
    response += f"• 'Hi {lead_name}, I can see you're interested in applying'\n"
    response += f"• 'Let me help you with the next steps in your application'\n"
    
    response += "\n**Next Steps:**\n"
    if lead.get("nextAction"):
        response += f"• {lead.get('nextAction')}\n"
    else:
        response += f"• Schedule follow-up call with {lead_name}\n"
    response += "• Send relevant course information\n"
    
    return response

from datetime import datetime, timezone

def _ago(iso: Optional[str]) -> Optional[str]:
    if not iso: return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z","+00:00"))
    except Exception:
        return None
    delta = datetime.now(timezone.utc) - (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc))
    d = delta.days
    return f"{d}d ago" if d >= 0 else None

def _line(k, v): return f"• {k}: {v}" if v not in (None, "", "N/A") else None

def _normalise_cta(obj: dict) -> dict:
    """Normalize CTA actions to FE-known actions"""
    known = {"open_call_console","open_email_composer","open_meeting_scheduler","view_profile"}
    if not isinstance(obj, dict): return {"label":"Open Call Console","action":"open_call_console"}
    label = obj.get("label") or "Open Call Console"
    action = obj.get("action") or "open_call_console"
    action_l = action.lower().strip().replace("-", "_")
    if action_l not in known:
        action_l = "view_profile" if "profile" in label.lower() else "open_call_console"
    return {"label": label, "action": action_l}

def _get_last_email_summary(lead: dict) -> Optional[str]:
    """Get last email summary with subject and timing"""
    # This would typically come from activities/communications table
    last_email = lead.get("last_email") or lead.get("lastEmail")
    if not last_email:
        return None
    
    if isinstance(last_email, dict):
        subject = last_email.get("subject", "No subject")
        sent_at = _ago(last_email.get("sent_at") or last_email.get("created_at"))
        return f"{sent_at} - \"{subject[:30]}{'...' if len(subject) > 30 else ''}\""
    
    return str(last_email)

def _get_email_count(lead: dict) -> Optional[str]:
    """Get email count summary"""
    sent = lead.get("emails_sent", 0) or lead.get("emailCount", 0)
    received = lead.get("emails_received", 0) or lead.get("emailsReceived", 0)
    
    if sent == 0 and received == 0:
        return None
    
    return f"{sent} sent, {received} received"

def _get_last_call_summary(lead: dict) -> Optional[str]:
    """Get last call summary with duration and engagement"""
    last_call = lead.get("last_call") or lead.get("lastCall")
    if not last_call:
        return None
    
    if isinstance(last_call, dict):
        duration = last_call.get("duration_minutes", 0)
        engagement = last_call.get("engagement_level", "unknown")
        called_at = _ago(last_call.get("called_at") or last_call.get("created_at"))
        
        duration_str = f"{duration} min" if duration > 0 else "unknown duration"
        engagement_str = f"({engagement})" if engagement != "unknown" else ""
        
        return f"{called_at} - {duration_str} {engagement_str}".strip()
    
    return str(last_call)

def _get_call_count(lead: dict) -> Optional[str]:
    """Get call count summary"""
    total_calls = lead.get("calls_total", 0) or lead.get("callCount", 0)
    total_duration = lead.get("calls_duration_hours", 0) or lead.get("callDurationHours", 0)
    
    if total_calls == 0:
        return None
    
    duration_str = f", {total_duration:.1f}h total" if total_duration > 0 else ""
    return f"{total_calls} total{duration_str}"

def _get_response_rate(lead: dict) -> Optional[str]:
    """Get response rate percentage"""
    response_rate = lead.get("response_rate") or lead.get("responseRate")
    if response_rate is None:
        return None
    
    try:
        rate = float(response_rate)
        return f"{int(rate * 100)}%"
    except:
        return str(response_rate)

async def generate_person_profile(query: str, context: Optional[Dict[str,Any]]) -> str:
    """Generate a narrated lead profile from facts (LLM styles it)."""
    # Early guard for untracked personal questions - only check the original user query
    ql = (query or "").lower()
    # More precise patterns to avoid false positives from RAG expansions
    personal_patterns = [
        r"\b(are|is|do|does|have|has|what|who).*(boyfriend|girlfriend|married|religion|political views|pet|dog|cat)\b",
        r"\b(do they|does.*have|are they).*(married|boyfriend|girlfriend|pets?|religion|political)\b"
    ]
    
    import re
    for pattern in personal_patterns:
        if re.search(pattern, ql, re.IGNORECASE):
            from app.ai.text_sanitiser import cleanse_conversational
            return cleanse_conversational(
                "We don't record personal details like that. Let's focus on the course fit, entry requirements, and the next sensible step."
            )
    
    lead = (context or {}).get("lead") or {}
    ai   = lead.get("aiInsights") or (context or {}).get("ai") or {}

    name = lead.get("name") or _extract_person_name(query, context) or "This person"

    # Build a compact, objective payload
    facts = {
        "name": name,
        "contact": {
            "email": lead.get("email"),
            "phone": lead.get("phone"),
            "owner": lead.get("owner") or lead.get("agent"),
            "source": lead.get("source"),
        },
        "academic": {
            "course": lead.get("courseInterest") or lead.get("latest_programme_name"),
            "campus": lead.get("campusPreference"),
            "academic_year": lead.get("academicYear") or lead.get("latest_academic_year"),
            "eligibility": lead.get("applicantType") or lead.get("country"),
        },
        "funnel": {
            "status": ("enquirer" if (lead.get("status") or lead.get("statusType") or "").lower() == "lead" else lead.get("status") or lead.get("statusType")),
            "lead_score": lead.get("leadScore"),
            "next_best_action": lead.get("nextAction") or ai.get("recommendedAction") or ai.get("callStrategy"),
            "follow_up": lead.get("followUpDate"),
            "conversion_probability": ai.get("conversionProbability"),
            "eta_days": ai.get("etaDays") or ai.get("eta_days"),
        },
        "activity": {
            "last_activity": _ago(lead.get("lastActivity") or lead.get("last_engagement_date")),
            "created": _ago(lead.get("createdAt") or lead.get("create_date")),
            "in_stage_since": _ago(lead.get("stageEnteredAt") or lead.get("statusEnteredAt")),
        },
        "conversation": {
            "last_email": _get_last_email_summary(lead),
            "email_count": _get_email_count(lead),
            "last_call": _get_last_call_summary(lead),
            "call_count": _get_call_count(lead),
            "response_rate": _get_response_rate(lead),
        },
        "situation": build_situation_context(context),
        "chips": [c for c in [
            ("Low engagement" if not _get_email_count(lead) and not _get_call_count(lead) else None),
            ("No consent" if not lead.get("gdpr_opt_in") else None),
            (f"{ai.get('conversionProbability'):.0%} prob" if isinstance(ai.get('conversionProbability'), (int,float)) else None),
        ] if c]
    }

    # Conversational gate: return 1–2 paragraphs if organic is enabled
    if IVY_ORGANIC_ENABLED:
        # Start with safe preview and dynamically add available lead data
        from app.ai.privacy_utils import safe_preview
        
        # Get the original lead object from context if available
        lead = (context or {}).get("lead", {})
        
        # Start with safe preview (whitelisted fields)
        preview = safe_preview(lead) if lead else {}
        if name and name not in (None, ""):
            preview["name"] = name
        
        # Dynamically add derived facts if they exist in the nested structure
        if facts.get("academic", {}).get("course"):
            preview["courseInterest"] = facts["academic"]["course"]
        if facts.get("funnel", {}).get("status"):
            status_val = facts["funnel"].get("status")
            if isinstance(status_val, str) and status_val.lower() == "lead":
                preview["status"] = "enquirer"
            else:
                preview["status"] = status_val
        if facts.get("conversation", {}).get("email_count") or facts.get("conversation", {}).get("call_count"):
            email_count = facts.get("conversation", {}).get("email_count", 0)
            call_count = facts.get("conversation", {}).get("call_count", 0)
            preview["touchpoint_count"] = email_count + call_count
        if facts.get("activity", {}).get("last_activity"):
            preview["last_engagement_date"] = facts["activity"]["last_activity"]
        if facts.get("contact", {}).get("email"):
            preview["email"] = facts["contact"]["email"]
        if facts.get("contact", {}).get("phone"):
            preview["phone"] = facts["contact"]["phone"]
        if facts.get("consent", {}).get("gdpr_opt_in") is not None:
            preview["gdpr_opt_in"] = facts["consent"]["gdpr_opt_in"]
        if facts.get("funnel", {}).get("conversion_probability") is not None:
            preview["conversion_probability"] = facts["funnel"]["conversion_probability"]
        if facts.get("insights"):
            preview["ai_insights"] = facts["insights"]
        if facts.get("triage", {}).get("score") is not None:
            preview["triage_score"] = facts["triage"]["score"]
        if facts.get("forecast"):
            preview["forecast"] = facts["forecast"]
        if facts.get("funnel", {}).get("application_status"):
            preview["application_status"] = facts["funnel"]["application_status"]
        if facts.get("funnel", {}).get("enrollment_status"):
            preview["enrollment_status"] = facts["funnel"]["enrollment_status"]
        
        # Add additional dynamic fields if available in lead
        if lead:
            if lead.get("firstContactAt"):
                preview["first_contact_at"] = lead["firstContactAt"]
            if lead.get("address"):
                preview["address"] = lead["address"]
            if lead.get("dateOfBirth"):
                preview["date_of_birth"] = lead["dateOfBirth"]
            if lead.get("appliedDate"):
                preview["applied_date"] = lead["appliedDate"]
            if lead.get("leadScore"):
                preview["leadScore"] = lead["leadScore"]
            if lead.get("latest_academic_year"):
                preview["latest_academic_year"] = lead["latest_academic_year"]
        
        result = await narrate(query, person=preview, intent="lead_profile")
        text = result["text"]
        return text

    # Legacy: structured narrative (kept for modal/legacy flows)
    name_disp = facts.get("name", "This person")
    response_parts = [f"Here's what I know about {name_disp}:"]
    if facts.get("academic", {}).get("course"):
        response_parts.append(f"Course: {facts['academic']['course']}")
    if facts.get("funnel", {}).get("status"):
        response_parts.append(f"Status: {facts['funnel']['status']}")
    return "\n".join(response_parts)

def add_gap_if_needed(text: str, knowledge_results: List[Dict[str,Any]], min_supported: float = 0.45) -> str:
    """Add gap notice when knowledge coverage is insufficient"""
    top = float(knowledge_results[0]["similarity_score"]) if knowledge_results else 0.0
    if top < min_supported:
        return text + "\n\n**Gap:** I can't find a specific policy/document covering this in your knowledge base. The closest source above may not fully answer the question."
    return text

# Pydantic models
class RagQuery(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None
    document_types: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    limit: int = 5
    similarity_threshold: float = 0.5
    json_mode: bool = False  # when True, expect JSON-only answer for specific tools

class SuggestionsQuery(BaseModel):
    query: str
    lead: Dict[str, Any]
    triage: Optional[Dict[str, Any]] = None
    forecast: Optional[Dict[str, Any]] = None
    mlForecast: Optional[Dict[str, Any]] = None
    anomalies: Optional[Dict[str, Any]] = None
    segmentation: Optional[Dict[str, Any]] = None
    cohort: Optional[Dict[str, Any]] = None

class RagResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    query_type: str
    confidence: float
    generated_at: datetime
    session_id: Optional[str] = None

class SuggestionsResponse(BaseModel):
    modal_title: str
    intent: str
    summary_bullets: List[str]
    key_metrics: Dict[str, Optional[float]]
    predictions: Dict[str, Any]
    next_best_action: Dict[str, str]
    ask: List[str]
    say: List[str]
    gaps: List[str]
    confidence: float
    ui: Dict[str, Any]
    explanations: Dict[str, Any]

class KnowledgeDocument(BaseModel):
    id: str
    title: str
    content: str
    document_type: str
    category: Optional[str]
    tags: List[str]
    similarity_score: Optional[float] = None

class EmbeddingRequest(BaseModel):
    text: str
    model: str = "text-embedding-004"

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    model: str
    usage: Dict[str, int]

# Suggestions generation functions
async def generate_suggestions_response(request: SuggestionsQuery) -> Dict[str, Any]:
    """Generate structured AI Suggestions Modal response using LLM"""
    
    intent = classify_suggestions_intent(request.query)
    lead_name = request.lead.get("name", "this lead")
    
    # Build the system prompt for Ivy
    system_prompt = """You are Ivy, an admissions copilot for UK HE.
Your ONLY job is to return a single JSON object that powers a compact AI Suggestions Modal.

Return ONLY valid JSON in this exact format:
{
  "modal_title": "string",
  "intent": "lead_profile | conversion_forecast | attendance_willingness | next_best_action | risk_check | source_quality | general_help",
  "summary_bullets": ["• …", "• …"],
  "key_metrics": {
    "conversion_probability_pct": null,
    "eta_days": null,
    "risk_score": null,
    "engagement_points": null
  },
  "predictions": {
    "conversion": {
      "probability": null,
      "eta_days": null,
      "confidence": null,
      "source": "triage|forecast|mlForecast"
    },
    "attendance_1to1": {
      "label": "likely | unlikely | unknown",
      "score": null,
      "rationale": "string (≤120 chars)"
    }
  },
  "next_best_action": { "label": "string", "reason": "string (≤140 chars)" },
  "ask": ["Question 1?", "Question 2?"],
  "say": ["Exact phrasing 1.", "Exact phrasing 2."],
  "gaps": ["missing engagement data"],
  "confidence": 0.0,
  "ui": {
    "primary_cta": { "label": "Book 1-1", "action": "open_meeting_scheduler" },
    "secondary_cta": { "label": "Send follow-up email", "action": "open_email_composer" },
    "chips": ["Low readiness", "Easily contactable"]
  },
  "explanations": {
    "used_fields": ["triage.score","forecast.probability"],
    "reasoning": "1 sentence on how you combined signals."
  }
}

Rules:
- Use only provided input fields
- Max 2-3 bullets in summary_bullets
- Max 6 bullets total across all sections
- British English
- Keep concise (≤420 chars total excluding numbers)
- If data missing, add to gaps[] and lower confidence"""

    # Build the human prompt with all available data
    human_prompt = f"""Query: "{request.query}"
Intent: {intent}

Lead data:
{_format_lead_data(request.lead)}

Triage data:
{_format_triage_data(request.triage) if request.triage else "Not available"}

Forecast data:
{_format_forecast_data(request.forecast) if request.forecast else "Not available"}

ML Forecast data:
{_format_ml_forecast_data(request.mlForecast) if request.mlForecast else "Not available"}

Anomalies data:
{_format_anomalies_data(request.anomalies) if request.anomalies else "Not available"}

Generate the suggestions modal JSON for {lead_name}."""

    try:
        # Import LangChain components following the Gospel pattern
        from app.ai import ACTIVE_MODEL, GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL
        
        # Initialize LLM using safe wrapper
        from app.ai.safe_llm import LLMCtx
        llm = LLMCtx(temperature=0.3)

        # Generate response
        response = await llm.ainvoke([("system", system_prompt), ("human", human_prompt)])
        
        # Parse JSON response
        import json
        import re
        
        content = response.strip()
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            
            # Ensure intent matches classification
            result["intent"] = intent
            
            # Apply clamping to prevent overflow
            from app.ai.post import clamp_list
            result["summary_bullets"] = clamp_list(result.get("summary_bullets", []), 3, 120)
            result["ask"] = clamp_list(result.get("ask", []), 2, 120)
            result["say"] = clamp_list(result.get("say", []), 2, 120)
            result["gaps"] = clamp_list(result.get("gaps", []), 3, 100)
            
            return result
        else:
            raise ValueError("No valid JSON found in response")
            
    except Exception as e:
        logger.error(f"Suggestions generation failed: {e}")
        # Return fallback response
        return _generate_fallback_suggestions(request, intent)

def _format_lead_data(lead: Dict[str, Any]) -> str:
    """Format lead data for prompt"""
    fields = []
    for key, value in lead.items():
        if value is not None and value != "":
            fields.append(f"  {key}: {value}")
    return "\n".join(fields) if fields else "  No lead data available"

def _format_triage_data(triage: Dict[str, Any]) -> str:
    """Format triage data for prompt"""
    if not triage:
        return "Not available"
    
    lines = []
    if "score" in triage:
        lines.append(f"  score: {triage['score']}")
    if "band" in triage:
        lines.append(f"  band: {triage['band']}")
    if "confidence" in triage:
        lines.append(f"  confidence: {triage['confidence']}")
    if "action" in triage:
        lines.append(f"  action: {triage['action']}")
    if "reasons" in triage and triage["reasons"]:
        lines.append(f"  reasons: {triage['reasons'][:3]}")  # First 3 reasons
    
    return "\n".join(lines) if lines else "Not available"

def _format_forecast_data(forecast: Dict[str, Any]) -> str:
    """Format forecast data for prompt"""
    if not forecast:
        return "Not available"
    
    lines = []
    if "probability" in forecast:
        lines.append(f"  probability: {forecast['probability']}")
    if "eta_days" in forecast:
        lines.append(f"  eta_days: {forecast['eta_days']}")
    if "confidence" in forecast:
        lines.append(f"  confidence: {forecast['confidence']}")
    if "drivers" in forecast and forecast["drivers"]:
        lines.append(f"  drivers: {forecast['drivers'][:3]}")  # First 3 drivers
    
    return "\n".join(lines) if lines else "Not available"

def _format_ml_forecast_data(ml_forecast: Dict[str, Any]) -> str:
    """Format ML forecast data for prompt"""
    if not ml_forecast:
        return "Not available"
    
    lines = []
    if "conversion_probability" in ml_forecast:
        lines.append(f"  conversion_probability: {ml_forecast['conversion_probability']}")
    if "eta_days" in ml_forecast:
        lines.append(f"  eta_days: {ml_forecast['eta_days']}")
    if "model_confidence" in ml_forecast:
        lines.append(f"  model_confidence: {ml_forecast['model_confidence']}")
    
    return "\n".join(lines) if lines else "Not available"

def _format_anomalies_data(anomalies: Dict[str, Any]) -> str:
    """Format anomalies data for prompt"""
    if not anomalies:
        return "Not available"
    
    lines = []
    if "overall_risk_score" in anomalies:
        lines.append(f"  overall_risk_score: {anomalies['overall_risk_score']}")
    if "risk_level" in anomalies:
        lines.append(f"  risk_level: {anomalies['risk_level']}")
    
    return "\n".join(lines) if lines else "Not available"

def _generate_fallback_suggestions(request: SuggestionsQuery, intent: str) -> Dict[str, Any]:
    """Generate fallback suggestions when LLM fails"""
    lead_name = request.lead.get("name", "this lead")
    lead = request.lead
    
    # Try to get triage and forecast data from context
    triage = getattr(request, 'triage', {}) or {}
    forecast = getattr(request, 'forecast', {}) or getattr(request, 'mlForecast', {}) or {}
    
    # Extract available data
    prob = forecast.get("probability") or triage.get("score") or lead.get("leadScore")
    eta = forecast.get("eta_days") or forecast.get("etaDays")
    risk = triage.get("risk_score") or lead.get("riskScore")
    engagement = lead.get("touchpoint_count", 0)
    
    # Determine next best action based on available data
    if prob and prob > 0.5:
        next_action = "Book 1-1 call"
        next_reason = "High conversion probability"
    elif engagement > 3:
        next_action = "Send follow-up email"
        next_reason = "Good engagement level"
    else:
        next_action = "Send info pack"
        next_reason = "Initial engagement needed"
    
    # Build summary bullets based on available data
    summary_bullets = []
    if prob:
        summary_bullets.append(f"• Conversion probability: {int(prob * 100)}%")
    if eta:
        summary_bullets.append(f"• Expected conversion in {eta} days")
    if engagement:
        summary_bullets.append(f"• {engagement} touchpoints recorded")
    if not summary_bullets:
        summary_bullets = ["• AI analysis temporarily unavailable", "• Using basic lead data"]
    
    return {
        "modal_title": f"AI Suggestions — {lead_name}",
        "intent": intent,
        "summary_bullets": summary_bullets,
        "key_metrics": {
            "conversion_probability_pct": int(prob * 100) if prob else None,
            "eta_days": eta,
            "risk_score": risk,
            "engagement_points": engagement
        },
        "predictions": {
            "conversion": {
                "probability": prob,
                "eta_days": eta,
                "confidence": 0.4 if prob else None,
                "source": "fallback"
            },
            "attendance_1to1": {
                "label": "likely" if (prob and prob > 0.5) else "unknown",
                "score": prob,
                "rationale": "Based on available signals" if prob else "Insufficient data for prediction"
            }
        },
        "next_best_action": {
            "label": next_action,
            "reason": next_reason
        },
        "ask": ["What's their main interest?", "When are they available?"],
        "say": ["Thanks for your interest", "Let's schedule a chat"],
        "gaps": ["AI analysis unavailable"] if not prob else [],
        "confidence": 0.4 if prob else 0.3,
        "ui": {
            "primary_cta": {"label": next_action, "action": "open_call_console" if "call" in next_action.lower() else "open_email_composer"},
            "secondary_cta": {"label": "View profile", "action": "view_profile"},
            "chips": ["Fallback mode"] if not prob else []
        },
        "explanations": {
            "used_fields": ["lead.nextAction", "triage.score", "forecast.probability"] if prob else ["lead.nextAction"],
            "reasoning": "Fallback response with available data" if prob else "Fallback response due to AI service unavailability."
        }
    }

# Real embedding service using Gemini API
async def get_embedding(text: str, model: str = "text-embedding-004") -> List[float]:
    """Generate real embedding using Gemini API"""
    try:
        from app.ai import GEMINI_API_KEY
        # Cache check
        ck = make_key("emb", {"t": text, "m": model})
        cached = CACHE.get(ck)
        if cached is not None:
            return cached
        
        if not GEMINI_API_KEY:
            logger.warning("Gemini API key not available, falling back to mock embedding")
            return await get_mock_embedding(text)
        
        import google.generativeai as genai
        
        # Configure Gemini
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Generate embedding using Gemini in a thread executor to avoid blocking
        def _embed_sync(text, model):
            clean_model = model.replace("models/", "") if isinstance(model, str) else "text-embedding-004"
            return genai.embed_content(
                model=clean_model,
                content=text,
                task_type="retrieval_document"
            )
        
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, _embed_sync, text, model)
        
        logger.info(f"✅ Generated real Gemini embedding for text: '{text[:50]}...' using {model}")
        # Cache embeddings by (text, model)
        CACHE.set(ck, result['embedding'])
        return result['embedding']
        
    except Exception as e:
        logger.error(f"Gemini embedding failed: {e}")
        logger.info("Falling back to mock embedding")
        return await get_mock_embedding(text)

async def get_mock_embedding(text: str) -> List[float]:
    """Fallback mock embedding when Gemini is unavailable"""
    import hashlib
    import random
    
    # Create deterministic but varied embeddings based on text content
    hash_obj = hashlib.md5(text.encode())
    seed = int(hash_obj.hexdigest()[:8], 16)
    random.seed(seed)
    
    # Generate 768-dimensional embedding (Gemini embedding-001 dimension)
    embedding = [random.uniform(-1, 1) for _ in range(768)]
    logger.warning(f"⚠️ Using mock embedding for text: '{text[:50]}...'")
    return embedding

@router.post("/suggestions", response_model=SuggestionsResponse)
async def generate_suggestions_endpoint(request: SuggestionsQuery):
    """Generate AI Suggestions Modal response for lead queries"""
    try:
        logger.info(f"Generating suggestions for query: '{request.query[:50]}...'")
        
        # Generate the structured response
        suggestions = await generate_suggestions_response(request)
        
        logger.info(f"Successfully generated suggestions with intent: {suggestions.get('intent')}")
        
        return suggestions
        
    except Exception as e:
        logger.error(f"Suggestions generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Suggestions generation failed: {str(e)}")

@router.post("/query", response_model=RagResponse)
async def query_rag(request: RagQuery):
    """
    Process RAG query with hybrid search (vector + text + natural language)
    """
    try:
        session_id = str(uuid.uuid4())
        
        # Short-circuit for JSON tool requests to avoid spurious RAG work
        if request.json_mode:
            sanitized_answer = await _generate_json_tool_response(request.query, request.context or {}, [])
            return RagResponse(
                answer=sanitized_answer, 
                sources=[], 
                query_type="tool_json", 
                confidence=0.95,
                generated_at=datetime.utcnow(), 
                session_id=session_id
            )
        
        # Step 1: Expand and bias the query
        expanded_query = expand_query_for_agent_usage(request.query)
        lead = (request.context or {}).get("lead") or {}
        bias_terms = " ".join([str(lead.get("courseInterest","")), str(lead.get("campusPreference",""))]).strip()
        biased_query = f"{expanded_query} {bias_terms}" if bias_terms else expanded_query

        # Ensure document_types and categories are lists, not dicts
        document_types = request.document_types
        categories = request.categories
        if isinstance(document_types, dict):
            document_types = list(document_types.values()) if document_types else None
        if isinstance(categories, dict):
            categories = list(categories.values()) if categories else None

        # Step 2: Initial search
        all_results = []
        initial_emb = await get_embedding(biased_query)
        initial_results, search_cache_hit = await hybrid_search(
            query_text=biased_query,
            query_embedding=initial_emb,
            document_types=document_types,
            categories=categories,
            limit_count=max(request.limit*3, 12),
            similarity_threshold=max(0.0, request.similarity_threshold - 0.05),
        )
        all_results.extend(initial_results)

        strong_count = sum(1 for r in initial_results if float(r.get("similarity_score", 0.0)) >= request.similarity_threshold)
        threshold_needed = max(3, request.limit // 2)

        # Step 3: At most one expansion if weak evidence; cache expansions by (session_id, query)
        expansions_used = [biased_query]
        if strong_count < threshold_needed:
            cache_key = make_key("exp", {"sid": session_id, "q": biased_query})
            cached = CACHE.get(cache_key)
            if cached:
                extra = cached
            else:
                extra = await multi_query_expansions(biased_query, request.context)
                extra = [q for q in extra if q.strip().lower() != biased_query.strip().lower()]
                CACHE.set(cache_key, extra[:2])
            for qx in extra[:1]:
                q_emb = await get_embedding(qx)
                rs, _hit = await hybrid_search(
                    query_text=qx,
                    query_embedding=q_emb,
                    document_types=document_types,
                    categories=categories,
                    limit_count=max(request.limit*3, 12),
                    similarity_threshold=max(0.0, request.similarity_threshold - 0.05),
                )
                all_results.extend(rs)
                expansions_used.append(qx)
        logger.info(f"Expansions used: {expansions_used}")
        
        # Step 4: Use MMR to select diverse top results (with dedupe)
        knowledge_results = mmr_select(query_vec=[0.0], candidates=all_results, k=request.limit)
        
        # Calculate adaptive confidence based on retrieval quality
        score_peek = sorted([float(r.get("similarity_score", 0.5)) for r in knowledge_results], reverse=True)
        
        logger.info(f"Knowledge search for '{request.query}' found {len(knowledge_results)} results")
        
        # Step 4: Also try natural language lead queries if relevant
        lead_results = None
        if any(keyword in request.query.lower() for keyword in ['lead', 'leads', 'student', 'prospect']):
            try:
                interpretation = interpret_natural_language_query(request.query)
                lead_results = await execute_lead_query(
                    interpretation["query_type"],
                    interpretation["parameters"],
                    limit=5
                )
            except Exception as e:
                logger.warning(f"Lead query failed: {e}")
        
        # Step 5: Classify intent and generate intelligent response
        detected_type = await classify_intent(request.query, request.context)
        logger.info(f"Detected intent: {detected_type}")
        
        logger.info(f"Generating response with knowledge_results={len(knowledge_results)}, lead_results={len(lead_results) if lead_results else 0}")
        answer, query_type, confidence = await generate_rag_response(
            query=request.query,
            knowledge_results=knowledge_results,
            lead_results=lead_results,
            context=request.context,
            detected_type=detected_type
        )
        
        # Apply adaptive confidence based on retrieval quality
        confidence = max(confidence, adaptive_confidence(score_peek))
        logger.info(f"Generated response: query_type={query_type}, confidence={confidence}")
        
        # Step 5: Prepare sources
        sources = []
        for result in knowledge_results:
            sources.append({
                "title": result["title"],
                "content": result["content"][:200] + "..." if len(result["content"]) > 200 else result["content"],
                "document_type": result["document_type"],
                "category": result["category"],
                "similarity_score": result["similarity_score"]
            })
        
        # Step 6: Log query for analytics
        await log_rag_query(
            query_text=request.query,
            query_type=query_type,
            context=request.context or {},
            retrieved_documents=[r["id"] for r in knowledge_results],
            response_text=answer,
            session_id=session_id,
            lead_id=request.context.get("lead", {}).get("uid") if request.context else None,
            meta={
                "steps": ["expand_bias", "search", "mmr", "classify", "answer"],
                "expansions_used": len(expansions_used) > 1,
                "kb_top_score": float(score_peek[0]) if score_peek else None,
                "cache_hits": {"search": bool(search_cache_hit)},
            }
        )
        
        # Sanitize response and enforce non-empty answer
        if request.json_mode:
            sanitized_answer = await _generate_json_tool_response(request.query, request.context or {}, knowledge_results)
        else:
            sanitized_answer = (answer or "").strip()
            if not sanitized_answer:
                person = ((request.context or {}).get("lead") or {}).get("name") or "this lead"
                sanitized_answer = f"I don't have a confident answer yet about {person}. I can summarise what we know so far or check relevant guidance."
            sanitized_answer = maybe_anonymise(sanitized_answer, (request.context or {}).get("anonymise", False))
        
        # Only add gap if no person source exists and retrieval was weak
        person_src = make_person_source(request.context)
        if not person_src:
            sanitized_answer = add_gap_if_needed(sanitized_answer, knowledge_results)
        
        return RagResponse(
            answer=sanitized_answer,
            sources=sources,
            query_type=query_type,
            confidence=confidence,
            generated_at=datetime.utcnow(),
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")


def extract_search_keywords(query: str) -> str:
    """Extract meaningful keywords from natural language query for better search"""
    import re
    
    # Remove common question words and phrases (less aggressive)
    stop_words = {
        'tell', 'me', 'about', 'what', 'is', 'the', 'how', 'can', 'you', 'please', 
        'i', 'want', 'to', 'know', 'information', 'details', 'explain', 'describe',
        'give', 'show', 'provide', 'find', 'search', 'for', 'a', 'an', 'and', 'or',
        'this', 'that', 'these', 'those', 'with', 'from', 'into', 'onto'
    }
    
    # Convert to lowercase and split into words
    words = re.findall(r'\b[a-zA-Z]+\b', query.lower())
    
    # Filter out stop words and keep meaningful terms (shorter words allowed for sales terms)
    keywords = []
    for word in words:
        if word not in stop_words and len(word) > 1:  # Allow 2+ character words
            keywords.append(word)
    
    # Add fuzzy matching for common typos
    fuzzy_map = {
        'couse': 'course',
        'cous': 'course',
        'cou': 'course',
        'sel': 'sell',
        'seling': 'selling',
        'mille': 'miller',
        'mill': 'miller',
        'sale': 'sales',
        'strateg': 'strategy',
        'method': 'methodology'
    }
    
    # Apply fuzzy corrections
    corrected_keywords = []
    for keyword in keywords:
        if keyword in fuzzy_map:
            corrected_keywords.append(fuzzy_map[keyword])
            logger.info(f"Applied fuzzy correction: '{keyword}' -> '{fuzzy_map[keyword]}'")
        else:
            corrected_keywords.append(keyword)
    
    # Join the remaining keywords
    result = ' '.join(corrected_keywords[:8])  # Increased limit to 8 keywords
    logger.info(f"Extracted keywords: '{query}' -> '{result}'")
    return result

def expand_query_for_agent_usage(query_text: str) -> str:
    """Expand person-specific queries to include underlying concepts for better search"""
    
    # Common patterns where agents ask about specific people but need concept-based info
    person_specific_patterns = {
        # APEL patterns - more comprehensive
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?apel\b': r'\1 apel accreditation prior learning',
        r'\b(\w+)\s+doesn\'t\s+have\s+any\s+qualifications\s+is\s+she\s+apel\?': r'\1 apel accreditation prior learning qualifications',
        r'\b(\w+)\s+(?:doesn\'t|does not|has no|without)\s+(?:any\s+)?qualifications?\s+(?:is|does|can|should|would)\s+(?:she|he|they)\s+apel\b': r'\1 apel accreditation prior learning qualifications',
        r'\bapel\s+(?:for|with|regarding|about)\s+(\w+)\b': r'apel accreditation prior learning \1',
        r'\bwhat\s+(?:should\s+i\s+tell|to\s+tell)\s+(\w+)\s+about\s+apel\b': r'apel accreditation prior learning \1 guidance',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?apel\s+applicant\b': r'\1 apel accreditation prior learning applicant',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?apel\s+applicant\?': r'\1 apel accreditation prior learning applicant',
        r'\b(\w+)\s+.*apel.*applicant': r'\1 apel accreditation prior learning applicant',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?apel\?': r'\1 apel accreditation prior learning',
        
        # Other common patterns can be added here
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?international\b': r'\1 international student visa requirements',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?mature\s+student\b': r'\1 mature student entry requirements',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?deferred\s+entry\b': r'\1 deferred entry process',
    }
    
    expanded_query = query_text.lower()
    
    # Apply pattern expansions
    import re
    for pattern, replacement in person_specific_patterns.items():
        expanded_query = re.sub(pattern, replacement, expanded_query, flags=re.IGNORECASE)
    
    # If we made expansions, combine original and expanded
    if expanded_query != query_text.lower():
        combined_query = f"{query_text} {expanded_query}"
        logger.info(f"Expanded query: '{query_text}' -> '{combined_query}'")
        return combined_query
    
    return query_text

async def hybrid_search(
    query_text: str,
    query_embedding: Optional[List[float]] = None,
    document_types: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    limit_count: int = 5,
    similarity_threshold: float = 0.5
) -> Tuple[List[Dict[str, Any]], bool]:
    """Perform hybrid vector + text search on knowledge documents with query expansion"""
    
    try:
        # Short TTL cache for full hybrid search results (120s)
        cache_key = make_key("hyb", {
            "qt": query_text,
            "has_emb": bool(query_embedding),
            "dt": document_types,
            "cat": categories,
            "lim": limit_count,
            "thr": round(similarity_threshold, 3)
        })
        cached = CACHE.get(cache_key)
        if cached is not None:
            logger.info("Hybrid search cache hit")
            return cached, True
        # Expand query for better agent usage patterns
        expanded_query = expand_query_for_agent_usage(query_text)
        
        # If we have embeddings, use vector similarity search
        if query_embedding:
            logger.info(f"Using vector similarity search for: '{query_text[:50]}...'")
            
            # Convert embedding to PostgreSQL vector format for this DB (expects square brackets)
            embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
            
            # Use the hybrid_search function from the database
            query = """
                SELECT 
                    id,
                    title,
                    content,
                    document_type,
                    category,
                    similarity_score,
                    rank_score
                FROM hybrid_search(%s, %s, %s, %s, %s, %s)
            """
            
            # Call the database function with proper parameters
            try:
                logger.info(f"Calling hybrid_search with threshold: {similarity_threshold}")
                results = await fetch(
                    query,
                    expanded_query,              # query_text (expanded)
                    embedding_str,                # query_embedding
                    document_types if document_types and len(document_types) > 0 else None,  # document_types
                    categories if categories and len(categories) > 0 else None,              # categories
                    limit_count,                  # limit_count
                    similarity_threshold          # similarity_threshold
                )

                logger.info(f"Vector search found {len(results)} results")
                if len(results) == 0:
                    logger.warning(
                        f"No results found for query: '{query_text[:50]}...' with threshold {similarity_threshold}"
                    )
                else:
                    logger.info(
                        f"Top result: {results[0]['title']} (similarity: {results[0]['similarity_score']:.3f})"
                    )
                CACHE.set(cache_key, results)
                return results, False
            except Exception as vector_err:
                logger.warning(
                    "Vector search unavailable (%s). Falling back to text search.",
                    getattr(vector_err, "pgerror", vector_err)
                )
                results = await text_search(expanded_query, document_types, categories, limit_count)
                CACHE.set(cache_key, results)
                return results, False

        else:
            # Fallback to text search if no embeddings
            logger.info(f"Falling back to text search for: '{query_text[:50]}...'")
            results = await text_search(expanded_query, document_types, categories, limit_count)
            CACHE.set(cache_key, results)
            return results, False
            
    except Exception as e:
        logger.error(f"Hybrid search failed: {e}")
        # Fallback to text search
        results = await text_search(expanded_query, document_types, categories, limit_count)
        return results, False

async def text_search(
    query_text: str,
    document_types: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    limit_count: int = 5
) -> List[Dict[str, Any]]:
    """Fallback text-based search on knowledge documents"""
    
    # Extract keywords for better search
    search_keywords = extract_search_keywords(query_text)
    
    # Build the query with flexible text search
    query = """
    SELECT 
        id,
        title,
        content,
        document_type,
        category,
        1.0 as similarity_score,
        CASE 
            WHEN title ILIKE %s THEN 1.0
            WHEN content ILIKE %s THEN 0.8
            WHEN title ILIKE %s THEN 0.6
            WHEN content ILIKE %s THEN 0.4
            ELSE 0.2
        END as rank_score
    FROM knowledge_documents
    WHERE is_active = TRUE
        AND (
            title ILIKE %s
            OR content ILIKE %s
            OR title ILIKE %s
            OR content ILIKE %s
        )
    """
    
    # Create flexible search patterns for individual keywords
    keywords_list = search_keywords.split()
    
    # Build dynamic query with OR conditions for each keyword
    where_conditions = []
    
    for keyword in keywords_list:
        where_conditions.append(f"title ILIKE %s")
        where_conditions.append(f"content ILIKE %s")
    
    # Update the query to use dynamic conditions
    query = f"""
    SELECT 
        id,
        title,
        content,
        document_type,
        category,
        1.0 as similarity_score,
        CASE 
            WHEN title ILIKE %s THEN 1.0
            WHEN content ILIKE %s THEN 0.8
            WHEN title ILIKE %s THEN 0.6
            WHEN content ILIKE %s THEN 0.4
            ELSE 0.2
        END as rank_score
    FROM knowledge_documents
    WHERE is_active = TRUE
        AND (
            {' OR '.join(where_conditions)}
        )
    """
    
    # Build params for the dynamic query
    params = [
        f'%{search_keywords}%',  # title exact match (CASE)
        f'%{search_keywords}%',  # content exact match (CASE)
        f'%{query_text}%',       # title full query match (CASE)
        f'%{query_text}%'        # content full query match (CASE)
    ]
    
    # Add params for each keyword in WHERE conditions
    for keyword in keywords_list:
        params.extend([f'%{keyword}%', f'%{keyword}%'])  # title and content for each keyword
    
    # Add document type filter if specified (avoid empty arrays)
    if document_types and len(document_types) > 0:
        query += " AND document_type = ANY(%s)"
        params.append(document_types)
    
    # Add category filter if specified (avoid empty arrays)
    if categories and len(categories) > 0:
        query += " AND category = ANY(%s)"
        params.append(categories)
    
    query += " ORDER BY rank_score DESC LIMIT %s"
    params.append(limit_count)
    
    try:
        logger.info(f"Executing hybrid search for: '{query_text}' -> keywords: '{search_keywords}'")
        results = await fetch(query, *params)
        logger.info(f"Hybrid search found {len(results)} raw results")
        
        formatted_results = [
            {
                "id": str(result["id"]),
                "title": result["title"],
                "content": result["content"],
                "document_type": result["document_type"],
                "category": result["category"],
                "similarity_score": float(result["similarity_score"]),
                "rank_score": float(result["rank_score"])
            }
            for result in results
        ]
        
        logger.info(f"Returning {len(formatted_results)} formatted results")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Text search failed: {e}")
        return []

async def generate_rag_response(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    lead_results: Optional[List[Dict[str, Any]]],
    context: Optional[Dict[str, Any]],
    detected_type: Optional[str] = None
) -> tuple[str, str, float]:
    """Generate intelligent response based on search results and context"""
    
    # Use detected_type if provided, otherwise fall back to keyword detection
    if detected_type:
        query_type = detected_type
        confidence = 0.9  # High confidence for LLM-detected intent
    else:
        query_lower = query.lower()
        
        # Enhanced query type detection for sales strategy
        if any(keyword in query_lower for keyword in ['sell', 'sales', 'strategy', 'approach', 'best to sell', 'how to sell', 'guide', 'help apply', 'support', 'advise']):
            query_type = "sales_strategy"
            confidence = 0.9
        elif any(keyword in query_lower for keyword in ['course', 'programme', 'curriculum']):
            query_type = "course_info"
            confidence = 0.9
        elif any(keyword in query_lower for keyword in ['lead', 'about this lead', 'this person']):
            query_type = "lead_info"
            confidence = 0.9
        elif any(keyword in query_lower for keyword in ['objection', 'concern', 'problem']):
            query_type = "objection_handling"
            confidence = 0.9
        elif any(keyword in query_lower for keyword in ['summary', 'summarize', 'recap']):
            query_type = "call_summary"
            confidence = 0.8
        else:
            query_type = "general_query"
            confidence = 0.7
    
    # Belt-and-braces: if it's clearly a profile-y question, force profile
    if is_profile_query(query):
        query_type = "lead_profile"
    
    # Generate contextual answer with enhanced logic
    if query_type == "lead_profile":
        # Do NOT bring policy KB in here unless a course is present
        answer = await generate_person_profile(query, context)
        return answer, query_type, 0.9
    elif query_type == "admissions_decision":
        # Handle admissions decision queries safely
        from app.ai.text_sanitiser import cleanse_conversational
        answer = cleanse_conversational(
            "I can't make admission decisions here. Check eligibility against entry requirements and any APEL guidance, then log a recommendation for an admissions tutor to review."
        )
        confidence = 0.9
    elif query_type == "lead_info":
        # Use person-focused synthesis for lead queries
        answer = await generate_person_answer(query, knowledge_results, context)
        confidence = max(confidence, 0.88)
    elif query_type == "sales_strategy" and context and context.get("lead"):
        # Special handling for personalised sales strategy
        answer = await generate_personalised_sales_strategy(query, knowledge_results, context)
        confidence = 0.9
    elif knowledge_results:
        # Use knowledge base results
        answer = await generate_knowledge_based_answer(query, knowledge_results, context)
        confidence = max(confidence, 0.8)
    elif lead_results:
        # Use lead data results - simplified fallback
        answer = f"Based on the lead data, I can help with: {query}. Please provide more specific details about what you'd like to know."
        confidence = 0.6
    else:
        # Fallback response
        answer = f"I understand you're asking about: {query}. I'd be happy to help, but I need more context. Could you provide additional details?"
        confidence = 0.5
    
    return answer, query_type, confidence

async def generate_personalised_sales_strategy(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    context: Dict[str, Any]
) -> str:
    """Generate personalised sales strategy using MEDDIC/Challenger methodologies"""
    
    try:
        # Import LangChain components following the Gospel pattern
        from app.ai import ACTIVE_MODEL, GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL
        
        # Initialize LLM using safe wrapper
        from app.ai.safe_llm import LLMCtx
        llm = LLMCtx(temperature=0.4)
        
        # Extract lead information
        lead = context.get("lead", {})
        lead_name = lead.get("name", "this prospect")
        course_interest = lead.get("courseInterest", "their chosen programme")
        lead_score = lead.get("leadScore", "N/A")
        status = lead.get("status", "N/A")
        
        # Build knowledge context
        knowledge_context = ""
        if knowledge_results:
            for result in knowledge_results[:3]:
                # Don't truncate content for policy/APEL responses - they need full context
                content = result['content']
                if len(content) > 500 and not any(word in result.get('category', '').lower() for word in ['policy', 'apel', 'admissions']):
                    content = content[:500] + "..."
                knowledge_context += f"**{result['title']}:**\n{content}\n\n"
        
        # Create AI prompt for personalised sales strategy
        messages = [
            ("system", """You are Ivy, an AI admissions advisor for Bridge CRM. You're helping an admissions agent who is currently on a phone call with a prospective student.

Your role:
- Provide real-time coaching for the agent during the live call
- Give specific things to say and ask during the conversation
- Apply Higher Education MEDDIC and Challenger methodologies in conversation
- Focus on educational journey and academic aspirations
- Address concerns as they come up during the call
- Guide through UCAS deadlines and application process

Guidelines:
- Be specific and actionable, not generic
- Reference the student's name and academic interests
- Use Higher Education MEDDIC framework (Motivation & Goals, Educational Buyer, Decision Criteria, Decision Process, Identify Inspiration, Champion)
- Apply Higher Education Challenger approach (Teach about opportunities, Tailor to student's goals, Take Control of application timeline)
- Focus on academic success and career outcomes, not price
- Emphasize UCAS deadlines, application strategy, and educational value
- Provide specific next steps for application process"""),
            ("human", f"""The agent is currently on a phone call with {lead_name} and needs immediate guidance.

Student Information:
- Name: {lead_name}
- Course Interest: {course_interest}
- Lead Score: {lead_score}
- Current Status: {status}

Query: {query}

Higher Education Methodology Knowledge:
{knowledge_context}

Give the agent specific things to say and ask during this call:
1. **Key Questions to Ask** - What should the agent ask {lead_name} right now?
2. **Information to Share** - What should the agent tell them about the course/process?
3. **Next Steps** - What should the agent suggest during the call?
4. **Application Concerns** - Likely academic or process concerns and guidance
5. **UCAS Timeline** - Specific actions and deadlines for application process
6. **Talking Points** - Key messages about educational value and career outcomes""")
        ]
        
        return await llm.ainvoke(messages)
        
    except Exception as e:
        logger.error(f"AI-powered sales strategy generation failed: {e}")
        logger.info("Falling back to rule-based sales strategy")
        return generate_fallback_sales_strategy(query, knowledge_results, context)

def generate_fallback_sales_strategy(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    context: Dict[str, Any]
) -> str:
    """Fallback rule-based sales strategy when AI is unavailable"""
    
    lead = context.get("lead", {})
    lead_name = lead.get("name", "this prospect")
    course_interest = lead.get("courseInterest", "their chosen program")
    lead_score = lead.get("leadScore", "N/A")
    
    strategy = f"**Personalized Admissions Guidance for {lead_name}**\n\n"
    
    strategy += f"**Student Analysis:**\n"
    strategy += f"- Course Interest: {course_interest}\n"
    strategy += f"- Lead Score: {lead_score}\n"
    strategy += f"- Status: {lead.get('status', 'N/A')}\n\n"
    
    strategy += f"**Higher Education MEDDIC Framework:**\n"
    strategy += f"• **Motivation & Goals:** Understand {lead_name}'s career aspirations and academic objectives\n"
    strategy += f"• **Educational Buyer:** Identify who influences the decision (student, parents, teachers)\n"
    strategy += f"• **Decision Criteria:** Focus on {course_interest} relevance to career goals and academic fit\n"
    strategy += f"• **Decision Process:** Map UCAS timeline and application requirements\n"
    strategy += f"• **Identify Inspiration:** Discover what drives {lead_name}'s passion and interests\n"
    strategy += f"• **Champion:** Find advocates who support {lead_name}'s educational journey\n\n"
    
    strategy += f"**Challenger Admissions Approach:**\n"
    strategy += f"• **Teach:** Share insights about {course_interest} career opportunities and industry trends\n"
    strategy += f"• **Tailor:** Customize guidance to {lead_name}'s specific academic goals and situation\n"
    strategy += f"• **Take Control:** Guide the application timeline and UCAS deadlines\n\n"
    
    if knowledge_results:
        strategy += f"**Key Talking Points:**\n"
        for result in knowledge_results[:2]:
            strategy += f"• Reference: {result['title']}\n"
    
    strategy += f"\n**UCAS Timeline & Next Steps:**\n"
    strategy += f"1. Schedule academic guidance session to discuss {course_interest}\n"
    strategy += f"2. Send detailed course information and UCAS application guide\n"
    strategy += f"3. Connect with current students or alumni in {course_interest}\n"
    strategy += f"4. Review application requirements and personal statement guidance\n"
    strategy += f"5. Set UCAS deadline reminders and application milestones\n"
    strategy += f"6. Follow up within 48 hours with specific application next steps\n"
    
    return strategy

async def generate_knowledge_based_answer(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    context: Optional[Dict[str, Any]]
) -> str:
    """Generate AI-powered answer using narrator for progressive language"""
    
    if not knowledge_results:
        return "I couldn't find relevant information in the knowledge base. Please try rephrasing your question."
    
    try:
        # Build facts for narrator
        facts = {
            "query": query,
            "person": (context or {}).get("lead", {}).get("name"),
            "key_points": [r.get("title") for r in knowledge_results[:3]],
            "citations": [{"title": r["title"], "score": r.get("similarity_score")} for r in knowledge_results[:4]],
            "weak_evidence": (not knowledge_results) or (knowledge_results and float(knowledge_results[0].get("similarity_score",0)) < 0.52)
        }
        
        # Detect intent from query for proper sanitization
        detected_intent = "policy_info"  # Default for knowledge-based answers
        if any(word in query.lower() for word in ["course", "programme", "degree", "ba", "ma", "bsc", "msc"]):
            detected_intent = "course_info"
        elif any(word in query.lower() for word in ["apel", "prior learning", "accreditation"]):
            detected_intent = "policy_info"
        
        # Use narrator for progressive language with intent
        result = await narrate(query, kb_sources=knowledge_results, intent=detected_intent)
        text = result["text"]
        # Standardise weak-evidence gap message
        text = add_gap_if_needed(text, knowledge_results)
        return text
        
    except Exception as e:
        logger.error(f"AI-powered RAG response failed: {e}")
        return "I couldn't process that query right now. Please try again."


# Old fallback functions removed - now using narrator

@router.post("/feedback")
async def submit_feedback(
    session_id: str,
    rating: int
):
    """Submit feedback for a RAG query"""
    
    try:
        # Clamp 1..5
        clamped = max(1, min(5, int(rating)))
        await execute("""
            UPDATE rag_query_history
            SET user_feedback = %s
            WHERE session_id = %s
        """, clamped, session_id)
        
        return {"message": "Feedback submitted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to submit feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
