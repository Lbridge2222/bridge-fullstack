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
    # Additional ML features
    engagement_score: Optional[float] = None
    conversion_probability: Optional[float] = None
    touchpoint_count: Optional[int] = None
    lifecycle_state: Optional[str] = None
    status: Optional[str] = None
    days_since_creation: Optional[float] = None
    engagement_level: Optional[str] = None


async def sql_query_leads(filters: Dict[str, Any], lead_ids: List[str] = None) -> List[LeadLite]:
    """
    Read-only query using enriched data matching the ML pipeline.
    Uses the same data source as the hardened ML system for consistency.
    """
    base = [
        "SELECT p.id::text as id,",
        "trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')) as name,",
        "p.email, p.lead_score, p.created_at as last_activity_at,",
        "p.engagement_score, p.conversion_probability, p.touchpoint_count,",
        "p.lifecycle_state, p.status,",
        "COALESCE(pr.name, 'unknown') as course,",
        "COALESCE(c.name, 'unknown') as campus,",
        "(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0)::double precision as days_since_creation,",
        "CASE ",
        "    WHEN p.engagement_score >= 80 THEN 'high'",
        "    WHEN p.engagement_score >= 50 THEN 'medium'",
        "    ELSE 'low'",
        "END as engagement_level",
        "FROM people p",
        "LEFT JOIN applications a ON p.id = a.person_id",
        "LEFT JOIN programmes pr ON a.programme_id = pr.id",
        "LEFT JOIN campuses c ON pr.campus_id = c.id",
        "WHERE p.lifecycle_state = 'lead'",
    ]
    params: List[Any] = []

    # If specific lead IDs are provided, filter by them
    if lead_ids:
        placeholders = ",".join(["%s"] * len(lead_ids))
        base.append(f"AND p.id::text IN ({placeholders})")
        params.extend(lead_ids)

    # Apply filters
    status = filters.get("status")
    if status:
        base.append("AND p.status = %s")
        params.append(status)
    
    source = filters.get("source")
    if source:
        base.append("AND p.source = %s")
        params.append(source)
    
    course = filters.get("course")
    if course:
        base.append("AND pr.name = %s")
        params.append(course)
    
    year = filters.get("year")
    if year:
        base.append("AND EXTRACT(YEAR FROM p.created_at) = %s")
        params.append(int(year))

    stalled = filters.get("stalled_days_gte")
    if stalled:
        base.append(
            "AND now() - p.created_at >= (%s || ' days')::interval"
        )
        params.append(int(stalled))

    base.append("ORDER BY p.created_at DESC LIMIT 500")
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
        next_action = "Send personalised follow-up"
    elif score >= 40:
        next_action = "Nurture with course information"
    else:
        next_action = "Send general information"
    
    return score, reasons, next_action


async def leads_triage(items: List[LeadLite]) -> List[Dict[str, Any]]:
    """
    ML-first triage using the hardened ML pipeline as primary scoring engine.
    LLM provides explanations and next actions, not scores.
    """
    try:
        # 1. Get ML predictions using the hardened pipeline
        from app.ai.advanced_ml_hardened import ml_pipeline
        
        lead_ids = [item.id for item in items]
        print(f"🤖 Getting ML predictions for {len(lead_ids)} leads...")
        
        ml_response = await ml_pipeline.predict_batch_hardened(lead_ids)
        
        # 2. Create base scores from ML predictions
        ml_scores = {pred.lead_id: pred.probability for pred in ml_response.predictions}
        ml_confidence = {pred.lead_id: pred.confidence for pred in ml_response.predictions}
        ml_calibrated = {pred.lead_id: pred.calibrated_probability for pred in ml_response.predictions}
        
        print(f"✅ ML predictions complete. Model: {ml_response.model_version}")
        
        # 3. Use LLM for explanations and next actions only
        ai_insights = await get_ai_explanations(items, ml_scores)
        
        # 4. Combine ML scores with AI insights
        combined = []
        for item in items:
            ml_score = ml_scores.get(item.id, 0.0) * 100  # Convert to 0-100 scale
            ml_conf = ml_confidence.get(item.id, 0.0)
            ml_cal = ml_calibrated.get(item.id, 0.0) * 100
            ai_insight = ai_insights.get(item.id, {})
            
            # Use calibrated probability as primary score
            primary_score = ml_cal if ml_cal > 0 else ml_score
            
            # Enforce escalation when calibrated >= 0.7
            should_escalate = (primary_score >= 70.0)

            combined.append({
                    "id": item.id,
                    "score": round(primary_score, 1),  # ML score is primary
                    "ml_confidence": round(ml_conf, 2),
                    "ml_probability": round(ml_score / 100, 3),
                    "ml_calibrated": round(ml_cal / 100, 3),
                    "reasons": ai_insight.get("reasons", []),
                    "next_action": (
                        ai_insight.get("next_action", "follow_up")
                        if not should_escalate else "schedule_interview_urgent"
                    ),
                    "insight": ai_insight.get("insight", ""),
                    "suggested_content": ai_insight.get("suggested_content", ""),
                    "action_rationale": ai_insight.get("action_rationale", _generate_action_rationale(item, ml_cal / 100.0)),
                    "escalate_to_interview": should_escalate or bool(ai_insight.get("escalate_to_interview", False)),
                    "feature_coverage": ai_insight.get("feature_coverage", 0.0)
                })
        
        return sorted(combined, key=lambda x: x['score'], reverse=True)
        
    except Exception as e:
        print(f"⚠️ ML-first triage failed: {e}, falling back to rules")
        return await leads_triage_rules_fallback(items)


async def get_ai_explanations(items: List[LeadLite], ml_scores: Dict[str, float]) -> Dict[str, Dict[str, Any]]:
    """
    Get AI explanations for ML scores using LLM.
    Focuses on explaining WHY the ML model gave this score, not changing it.
    """
    if ACTIVE_MODEL == "none":
        # Return basic explanations without LLM
        explanations = {}
        for item in items:
            score = ml_scores.get(item.id, 0.0)
            explanations[item.id] = {
                "reasons": _generate_basic_reasons(item, score),
                "next_action": _suggest_basic_action(item, score)[0],
                "suggested_content": _suggest_basic_action(item, score)[1],
                "insight": f"ML score: {score:.1%}",
                "action_rationale": _generate_action_rationale(item, score),
                "escalate_to_interview": True if (score >= 0.7) else False,
                "feature_coverage": 1.0
            }
        return explanations

    try:
        if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.3, api_key=OPENAI_API_KEY)
            print(f"🤖 Using OpenAI for explanations: {OPENAI_MODEL}")
        elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            # CRITICAL: Explicitly normalize to -001 to prevent LangChain remapping to Pro
            normalized_model = "gemini-2.0-flash-001" if "2.0-flash" in GEMINI_MODEL else GEMINI_MODEL
            llm = ChatGoogleGenerativeAI(
                model=normalized_model,
                temperature=0.3,
                google_api_key=GEMINI_API_KEY
            )
            print(f"🤖 Using Gemini for explanations: {normalized_model}")
        else:
            raise Exception(f"No valid AI model available. Active: {ACTIVE_MODEL}")

        from langchain_core.prompts import ChatPromptTemplate
        from pathlib import Path
        import json
        
        schema = Path(__file__).resolve().parents[1] / "schema" / "LEADS_SCHEMA.md"
        triage_prompt_path = Path(__file__).resolve().parents[1] / "prompts" / "leads_triage.md"
        
        if not schema.exists() or not triage_prompt_path.exists():
            print("⚠️  Prompt files not found, using basic explanations")
            raise Exception("Prompt files missing")
            
        schema_text = schema.read_text(encoding="utf-8")
        prompt_text = triage_prompt_path.read_text(encoding="utf-8")
        prompt = ChatPromptTemplate.from_template(prompt_text)

        # Prepare enriched features for AI
        features = []
        for item in items:
            ml_score = ml_scores.get(item.id, 0.0)
            features.append({
                "id": item.id,
                "name": item.name,
                "lead_score": item.lead_score or 0,
                "engagement_score": item.engagement_score or 0,
                "conversion_probability": item.conversion_probability or 0,
                "touchpoint_count": item.touchpoint_count or 0,
                "days_since_creation": item.days_since_creation or 0,
                "course": item.course or "unknown",
                "campus": item.campus or "unknown",
                "engagement_level": item.engagement_level or "low",
                "status": item.status or "new",
                "last_activity_at": item.last_activity_at.isoformat() if item.last_activity_at else None,
                "ml_score": ml_score,
                "ml_percentage": f"{ml_score:.1%}"
            })
        
        messages = prompt.format_messages(schema=schema_text, leads=json.dumps(features))
        resp = await llm.ainvoke(messages)
        text = resp.content if hasattr(resp, "content") else str(resp)
        
        try:
            # Clean the response text - remove any markdown formatting
            cleaned_text = text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()
            
            print(f"🔍 LLM Response (first 200 chars): {cleaned_text[:200]}")
            
            raw_parsed = json.loads(cleaned_text)

            # Normalize to a list of items with ids
            def to_items(obj: Any) -> List[Dict[str, Any]]:
                if isinstance(obj, list):
                    return [x for x in obj if isinstance(x, dict)]
                if isinstance(obj, dict):
                    # Common wrappers
                    for key in ["items", "results", "explanations", "data"]:
                        if key in obj and isinstance(obj[key], list):
                            return [x for x in obj[key] if isinstance(x, dict)]
                    # Single object case
                    return [obj]
                return []

            items_list = to_items(raw_parsed)
            if not items_list:
                # Last resort: attempt best-effort extraction of a JSON object and retry
                extracted = _extract_json_object(cleaned_text)
                items_list = to_items(extracted) if extracted else []

            explanations: Dict[str, Dict[str, Any]] = {}
            for itm in items_list:
                lead_id = itm.get("id") or itm.get("lead_id") or itm.get("uid")
                if not lead_id:
                    continue
                explanations[str(lead_id)] = {
                    "reasons": itm.get("reasons", []),
                    "next_action": itm.get("next_action", "follow_up"),
                    "insight": itm.get("insight", ""),
                    "suggested_content": itm.get("suggested_content", ""),
                    "action_rationale": itm.get("action_rationale", ""),
                    "escalate_to_interview": bool(itm.get("escalate_to_interview", False)),
                    "feature_coverage": 1.0  # Assume full coverage for now
                }
            if explanations:
                return explanations
            raise ValueError("No valid explanation items with ids found")
        except Exception as e:
            print(f"⚠️  JSON parsing failed: {e}")
            print(f"🔍 Raw response: {text[:500]}")
            raise e
            
    except Exception as e:
        print(f"⚠️  AI explanations failed: {e}, using basic explanations")
        # Fallback to basic explanations
        explanations = {}
        for item in items:
            score = ml_scores.get(item.id, 0.0)
            explanations[item.id] = {
                "reasons": _generate_basic_reasons(item, score),
                "next_action": _suggest_basic_action(item, score)[0],
                "suggested_content": _suggest_basic_action(item, score)[1],
                "insight": f"ML score: {score:.1%}",
                "action_rationale": _generate_action_rationale(item, score),
                "escalate_to_interview": True if (score >= 0.7) else False,
                "feature_coverage": 1.0
            }
        return explanations


def _generate_basic_reasons(item: LeadLite, ml_score: float) -> List[str]:
    """Generate basic reasons for ML score without LLM"""
    reasons = []
    
    if ml_score >= 0.8:
        reasons.append("Very high conversion probability")
    elif ml_score >= 0.6:
        reasons.append("High conversion probability")
    elif ml_score >= 0.4:
        reasons.append("Moderate conversion probability")
    else:
        reasons.append("Low conversion probability")
    
    if item.lead_score and item.lead_score >= 80:
        reasons.append("Strong lead score")
    elif item.lead_score and item.lead_score >= 60:
        reasons.append("Good lead score")
    
    if item.engagement_score and item.engagement_score >= 80:
        reasons.append("High engagement")
    elif item.engagement_score and item.engagement_score >= 50:
        reasons.append("Moderate engagement")
    
    if item.days_since_creation and item.days_since_creation <= 7:
        reasons.append("Recent lead")
    elif item.days_since_creation and item.days_since_creation <= 30:
        reasons.append("Recent activity")
    
    return reasons[:3]  # Limit to 3 reasons


def _suggest_basic_action(lead: LeadLite, ml_score: float) -> tuple[str, str]:
    """Suggest personalised next action based on lead's individual profile"""
    course = lead.course or "general_course"
    campus = lead.campus or "main_campus"
    days_old = lead.days_since_creation or 0
    engagement = lead.engagement_level or "low"
    touchpoints = lead.touchpoint_count or 0
    
    # Personalize based on individual characteristics, not just score
    course_clean = course.lower().replace(' ', '_').replace('(', '').replace(')', '')
    campus_clean = campus.lower().replace(' ', '_')
    
    # Factor in timeline urgency
    is_new = days_old <= 7
    is_stalled = days_old > 21
    is_highly_engaged = engagement == "high" or touchpoints > 5
    
    # Personalized action selection
    if ml_score >= 0.8:
        if is_highly_engaged:
            action = f"schedule_course_director_meeting_{course_clean}"
            content = f"Book urgent meeting with {course} Course Director for {lead.name}. High engagement + high score = priority candidate."
        else:
            action = "schedule_interview_urgent"
            content = f"Fast-track {lead.name} for interview. High conversion probability - book within 48 hours."
    
    elif ml_score >= 0.6:
        if is_new:
            action = f"send_welcome_package_{course_clean}"
            content = f"Send personalised welcome package for {course} including virtual tour and course highlights."
        elif is_stalled:
            action = f"invite_exclusive_taster_{course_clean}"
            content = f"Re-engage {lead.name} with exclusive {course} taster session at {campus}."
        elif "music" in course.lower():
            action = f"send_studio_showcase_{campus_clean}"
            content = f"Share latest music studio equipment and recent student productions from {campus}."
        elif "business" in course.lower():
            action = f"send_industry_connections_{course_clean}"
            content = f"Highlight {course} industry partnerships and recent graduate employment success."
        else:
            action = f"invite_open_day_{campus_clean}"
            content = f"Invite to next open day at {campus}. Personalized campus tour and faculty meetings."
    
    elif ml_score >= 0.4:
        if touchpoints < 2:
            action = f"send_course_overview_{course_clean}"
            content = f"Send comprehensive {course} overview with career pathways and module breakdown."
        elif is_stalled:
            action = "send_student_testimonials"
            content = f"Share authentic {course} student stories and career progression examples."
        else:
            action = "schedule_course_consultation"
            content = f"Book consultation with {course} admissions advisor to address specific questions."
    
    else:
        if is_new:
            action = f"nurture_sequence_start_{course_clean}"
            content = f"Begin nurturing sequence with {course} career prospects and industry insights."
        else:
            action = "send_financial_aid_info"
            content = f"Provide funding options and payment plans for {course}. Include scholarship opportunities."
    
    return action, content


def _generate_action_rationale(lead: LeadLite, ml_score: float) -> str:
    """Generate a concise rationale explaining why the chosen action is appropriate.
    Uses concrete drivers like engagement_score, touchpoints, recency, and course/campus.
    """
    parts: List[str] = []
    if lead.engagement_score is not None:
        parts.append(f"engagement score {int(lead.engagement_score)}")
    if lead.touchpoint_count is not None:
        parts.append(f"{lead.touchpoint_count} touchpoints")
    if lead.days_since_creation is not None:
        days = int(lead.days_since_creation)
        parts.append(f"created {days} day{'s' if days != 1 else ''} ago")
    if lead.course and lead.course != "unknown":
        parts.append(f"interested in {lead.course}")
    if lead.campus and lead.campus != "unknown":
        parts.append(f"{lead.campus} campus preference")

    prob = f"{int(round(ml_score * 100))}% prob"
    summary = ", ".join(parts) if parts else "profile signals"
    return f"Chosen due to {summary}; ML indicates {prob}."


async def leads_triage_rules_fallback(items: List[LeadLite]) -> List[Dict[str, Any]]:
    """Fallback to rules-based scoring if ML fails"""
    base: List[Dict[str, Any]] = []
    for l in items:
        score, reasons, next_action = _rule_score(l)
        base.append({"id": l.id, "score": score, "reasons": reasons, "next_action": next_action})
    
    if not base:
        return []

    # Normalize scores to 0-100 range
    max_score = max(x["score"] for x in base) or 1.0
    for x in base:
        x["score"] = round((x["score"] / max_score) * 100.0, 1)
        x["ml_confidence"] = 0.5  # Default confidence for rules
        x["ml_probability"] = x["score"] / 100.0
        x["ml_calibrated"] = x["score"] / 100.0
        x["insight"] = f"Rules-based score: {x['score']:.1f}%"
        x["feature_coverage"] = 0.8  # Assume 80% coverage for rules
    
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
            # CRITICAL: Explicitly normalize to -001 to prevent LangChain remapping to Pro
            normalized_model = "gemini-2.0-flash-001" if "2.0-flash" in GEMINI_MODEL else GEMINI_MODEL
            llm = ChatGoogleGenerativeAI(
                model=normalized_model,
                temperature=0.4,
                google_api_key=GEMINI_API_KEY
            )
            print(f"🤖 Composing email with Gemini: {normalized_model}")
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


