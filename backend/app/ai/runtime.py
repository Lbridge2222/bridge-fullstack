"""
Ivy runtime: organic system prompt + narrator utilities.

- IVY_ORGANIC_SYSTEM_PROMPT   → higher-education super-intelligence prompt
- normalize_user_text(text)   → tiny typo normaliser (cached)
- narrate(mode, query, person, kb_sources, ui_ctx) → primary narrator
- narrate_triage_bullets(item) → 2 bullets explaining a triage/score

Assumptions: existing project provides
- app.ai.safe_llm.LLMCtx
- app.ai.cache.CACHE / make_key
- app.ai.AI_TIMEOUT_MAIN_MS / AI_TIMEOUT_HELPER_MS / IVY_ORGANIC_ENABLED
- app.ai.ivy_conversation_config.build_sampling_args
- app.ai.text_sanitiser.cleanse_conversational
"""

from __future__ import annotations
import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.ai import (
    AI_TIMEOUT_MAIN_MS,
    AI_TIMEOUT_HELPER_MS,
    IVY_ORGANIC_ENABLED,
    AI_PARSER_ENABLED,
    AI_NARRATOR_ENABLED,
    AI_CACHE_TTL_S
)
from app.ai.cache import CACHE, make_key
from app.ai.safe_llm import LLMCtx
from app.ai.ivy_conversation_config import build_sampling_args
from app.ai.text_sanitiser import cleanse_conversational
from app.ai.short_memory import get_condensed_context
from app.ai.prompts import SYSTEM_PARSER_JSON, SYSTEM_NARRATOR, SYSTEM_TRIAGE_EXPLAIN, IVY_ORGANIC_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────
# Small helpers
# ──────────────────────────────────────────────────────────────────────────

_PRIVATE_LIFE_TERMS = ("dog", "cat", "pet", "boyfriend", "girlfriend", "married", "religion", "politics")

def _personal_out_of_scope(query: str) -> bool:
    q = (query or "").lower()
    
    # Skip privacy guard for APEL-related queries
    if "apel" in q:
        return False
    
    # More precise pattern matching - only trigger on direct personal questions
    # Avoid catching legitimate queries that happen to contain these words
    _PRIV_PAT = re.compile(r"\b(are|is|do|does|have|has|what|who).*(boyfriend|girlfriend|married|religion|political views|pets?|dog|cat)\b", re.I)
    # Also check for direct questions about personal life
    _DIRECT_PERSONAL = re.compile(r"\b(do they|does.*have|are they).*(married|boyfriend|girlfriend|pets?|religion|political)\b", re.I)
    
    triggered = bool(_PRIV_PAT.search(q) or _DIRECT_PERSONAL.search(q))
    if triggered:
        logger.debug("privacy_guard_triggered", extra={"query": query, "matched_pattern": "personal_info"})
    
    return triggered

def _privacy_refusal() -> str:
    # Warm, dry, and service-oriented with human variation.
    variants = [
        "We don't track personal details like that — let's focus on course fit, entry requirements and the next steps.",
        "That's beyond our scope, I'm afraid — let's stick to course information and application support.",
        "We don't record that sort of thing — how about we look at their academic interests instead?",
        "Personal details aren't something we track — let's focus on what we can help with: courses, applications, and next steps.",
        "That's not something we keep records of — shall we look at their course preferences or application status?",
        "We don't have that information — let's concentrate on their academic journey and how we can support them."
    ]
    import random
    return random.choice(variants)

def _on_profile(ui_ctx: Optional[Dict[str, Any]]) -> bool:
    try:
        return bool((ui_ctx or {}).get("view") == "profile")
    except Exception:
        return False

def _compact_person_preview(person: Dict[str, Any]) -> Dict[str, Any]:
    """Small, PII-safe preview for grounding without dumping raw PII."""
    if not isinstance(person, dict):
        return {}
    
    # Start with flat keys
    keys = ("name", "status", "courseInterest", "latest_academic_year", "source", "touchpoint_count", "last_engagement_date", "email", "phone", "conversion_probability", "ai_insights", "triage_score", "forecast", "leadScore", "gdpr_opt_in", "application_status", "enrollment_status")
    result = {k: person.get(k) for k in keys if k in person}
    
    # Also include nested facts if present
    if "facts" in person and isinstance(person["facts"], dict):
        facts = person["facts"]
        # Extract key facts from nested structure
        if "academic" in facts:
            result["academic_facts"] = facts["academic"]
        if "funnel" in facts:
            result["funnel_facts"] = facts["funnel"]
        if "activity" in facts:
            result["activity_facts"] = facts["activity"]
        if "engagement" in facts:
            result["engagement_facts"] = facts["engagement"]
    
    return result

def _format_facts_list(person: Dict[str, Any]) -> List[str]:
    """Turn person dict into a crisp, stable facts list (no invented numbers)."""
    facts: List[str] = []
    add = lambda label, val: facts.append(f"{label}: {val}") if val not in (None, "", [], {}) else None

    add("Name", person.get("name"))
    add("Course", person.get("courseInterest") or person.get("latest_programme_name"))
    add("Status", person.get("status") or person.get("statusType"))
    add("Last activity", (person.get("last_engagement_date") or "")[:10])
    tp = person.get("touchpoint_count")
    if isinstance(tp, (int, float)):
        add("Touchpoints", int(tp))
    add("Source", person.get("source"))
    return facts

def _compact_sources(kb_sources: Optional[List[Dict[str, Any]]], max_n: int = 3) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for s in (kb_sources or [])[:max_n]:
        # Don't truncate content for policy/APEL responses - they need full context
        content = s.get("preview") or s.get("content") or ""
        category = (s.get("category") or "").lower()
        if len(content) > 200 and not any(word in category for word in ['policy', 'apel', 'admissions']):
            content = content[:200]
        
        out.append({
            "title": (s.get("title") or "")[:120],
            "category": s.get("category"),
            "document_type": s.get("document_type"),
            "similarity_score": float(s.get("similarity_score", 0.0) or 0.0),
            "preview": content,
        })
    return out

# ──────────────────────────────────────────────────────────────────────────
# Public helpers
# ──────────────────────────────────────────────────────────────────────────

async def normalize_user_text(text: str) -> str:
    """Robust typo-tolerant rewrite w/ cache."""
    t = (text or "").strip()
    if not t: return t
    
    # Quick name corrections before LLM processing
    import re
    t = re.sub(r"\bislo\b", "isla", t, flags=re.IGNORECASE)
    
    k = make_key("norm", {"t": t})
    if cached := CACHE.get(k): return cached
    # prompt inline: short deterministic normaliser
    llm = LLMCtx(model="gemini-2.0-flash", temperature=0.3, timeout_ms=AI_TIMEOUT_HELPER_MS)
    out = await llm.ainvoke([("system","Rewrite the user's message correcting obvious typos; keep meaning; ≤ 20 words."), ("human", t)])
    norm = out or t
    CACHE.set(k, norm)
    return norm

async def flash_parse_query(text: str) -> Dict[str, Any]:
    """LLM parser → strict JSON; fallback to defaults."""
    if not AI_PARSER_ENABLED:
        return {"intent":"general_search","entities":{"source":None,"course":None},"time_range":{"from":None,"to":None,"preset":"last_30d"},"limit":50}
    k = make_key("parse", {"t":text})
    if cached := CACHE.get(k): return cached
    llm = LLMCtx(model="gemini-2.0-flash", temperature=0.3, timeout_ms=AI_TIMEOUT_HELPER_MS)
    out = await llm.ainvoke([("system", SYSTEM_PARSER_JSON), ("human", text)])
    try:
        data = json.loads(out)
        # minimal validation
        data.setdefault("limit", 50)
        CACHE.set(k, data)
        return data
    except Exception:
        return {"intent":"general_search","entities":{"source":None,"course":None},"time_range":{"from":None,"to":None,"preset":"last_30d"},"limit":50}

async def narrate(query: str, person: Optional[Dict[str, Any]] = None, kb_sources: Optional[List[Dict[str, Any]]] = None, ui_ctx: Optional[Dict[str, Any]] = None, intent: str = None) -> Dict[str, Any]:
    """
    Primary narrator: organic, grounded, action-aware.

    Returns:
        {
            "text": str,           # cleaned, conversational text
            "action": str | None,  # single UI action (if any)
            "sources": List[Dict]  # compact KB sources (if any)
        }
    """
    # Early exit for privacy boundary
    if _personal_out_of_scope(query):
        return {
            "text": _privacy_refusal(),
            "action": None,
            "sources": [],
        }

    # Build cache key
    cache_key = make_key("narrate", {
        "query": query,
        "person": _compact_person_preview(person or {}),
        "sources": _compact_sources(kb_sources)
    })

    # Check cache
    cached = CACHE.get(cache_key)
    if cached:
        return cached

    # Compose messages with audience awareness
    audience = (ui_ctx or {}).get("audience", "agent")
    human_payload = f"Audience: {audience}\nQuery: {query}\n"
    if person:
        # Include disambiguation notes if present
        person_data = _compact_person_preview(person)
        if person.get("disambiguation_notes"):
            human_payload += f"Disambiguation: {person['disambiguation_notes']}\n"
        human_payload += f"Person: {json.dumps(person_data, ensure_ascii=False)}\n"
    if kb_sources:
        human_payload += f"Sources: {json.dumps(_compact_sources(kb_sources), ensure_ascii=False)}\n"
    if ui_ctx:
        human_payload += f"UI context: {json.dumps(ui_ctx, ensure_ascii=False)}\n"

    messages = [
        ("system", IVY_ORGANIC_SYSTEM_PROMPT),
        ("human", human_payload),
    ]

    # Call LLM
    llm = LLMCtx(model="gemini-2.0-flash", temperature=0.7)
    raw = await llm.ainvoke(messages)
    if not raw:
        return {
            "text": "I'm having trouble generating a response right now. Please try again.",
            "action": None,
            "sources": [],
        }

    # Clean text - preserve structure for structured intents
    structured_intents = {"guidance", "nba", "policy_info", "course_info"}
    extra = {"contract_applied": intent in structured_intents}
    text = cleanse_conversational(raw, intent, extra=extra)

    # Opportunistically extract a single action (improved heuristics)
    action = None
    text_lower = text.lower()
    
    # More sophisticated action detection with context awareness
    if any(phrase in text_lower for phrase in ["call them", "give them a call", "phone them", "ring them", "contact by phone"]):
        action = "open_call_console"
    elif any(phrase in text_lower for phrase in ["send an email", "email them", "write to them", "drop them a line", "follow up by email", "write to them about", "send about", "email about"]):
        action = "open_email_composer"
    elif any(phrase in text_lower for phrase in ["book a meeting", "schedule a call", "arrange a chat", "set up a meeting", "book some time", "schedule a call for", "book a call for", "arrange a meeting", "set up a call"]):
        action = "open_meeting_scheduler"
    elif any(phrase in text_lower for phrase in ["view their profile", "check their details", "see their information", "look at their profile"]) and not _on_profile(ui_ctx):
        action = "view_profile"
    # Fallback to simple keyword matching if no contextual phrases found
    elif "open_call_console" in text_lower:
        action = "open_call_console"
    elif "open_email_composer" in text_lower or ("email" in text_lower and "composer" in text_lower):
        action = "open_email_composer"
    elif "open_meeting_scheduler" in text_lower or ("meeting" in text_lower and "scheduler" in text_lower):
        action = "open_meeting_scheduler"
    elif "view_profile" in text_lower and not _on_profile(ui_ctx):
        action = "view_profile"

    # Build result
    result = {
        "text": text,
        "action": action,
        "sources": _compact_sources(kb_sources),
    }

    # Cache and return
    CACHE.set(cache_key, result)
    return result

async def narrate_triage_bullets(item: Dict[str,Any]) -> str:
    llm = LLMCtx(model="gemini-2.0-flash", temperature=0.4)
    out = await llm.ainvoke([("system", SYSTEM_TRIAGE_EXPLAIN),
                             ("human", f"FACTS:\n{json.dumps(item, ensure_ascii=False)}\nReturn 2 bullets.")])
    return out or "- Scored via engagement/recency\n- Watch consent/source quality"
