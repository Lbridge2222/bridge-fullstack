import json
import logging
from typing import Dict, Any
from app.ai import AI_PARSER_ENABLED, AI_NARRATOR_ENABLED, AI_CACHE_TTL_S
from app.ai.cache import CACHE, make_key
from app.ai.safe_llm import LLMCtx
from app.ai import AI_TIMEOUT_MAIN_MS, AI_TIMEOUT_HELPER_MS, IVY_ORGANIC_ENABLED
from app.ai.short_memory import get_condensed_context
from app.ai.prompts import SYSTEM_PARSER_JSON, SYSTEM_NARRATOR, SYSTEM_TRIAGE_EXPLAIN, IVY_ORGANIC_SYSTEM_PROMPT
from app.ai.ivy_conversation_config import build_sampling_args

logger = logging.getLogger(__name__)

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
    llm = LLMCtx(model="gemini-2.0-flash", temperature=0.0, timeout_ms=AI_TIMEOUT_HELPER_MS)
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
    llm = LLMCtx(model="gemini-2.0-flash", temperature=0.0, timeout_ms=AI_TIMEOUT_HELPER_MS)
    out = await llm.ainvoke([("system", SYSTEM_PARSER_JSON), ("human", text)])
    try:
        data = json.loads(out)
        # minimal validation
        data.setdefault("limit", 50)
        CACHE.set(k, data)
        return data
    except Exception:
        return {"intent":"general_search","entities":{"source":None,"course":None},"time_range":{"from":None,"to":None,"preset":"last_30d"},"limit":50}

async def narrate(mode: str, facts: Dict[str,Any]) -> str:
    """Generate progressive language from facts; never invent numbers."""
    if not AI_NARRATOR_ENABLED:  # deterministic fallback
        lines = ["**What You Know**"]
        for k,v in facts.items():
            if isinstance(v,(str,int,float)) and k not in ("sources","raw"):
                lines.append(f"• {k.replace('_',' ').title()}: {v}")
        lines.append("\n**Next Steps**\n• Follow up accordingly.")
        return "\n".join(lines)
    k = make_key("narr", {"m":mode,"f":facts})
    if cached := CACHE.get(k): return cached
    # Use LLMCtx for consistent LLM handling
    try:
        # Use organic system prompt as the overarching style, gated by feature flag
        sampling = build_sampling_args()
        llm = LLMCtx(temperature=min(max(sampling.get("temperature", 0.7), 0.0), 1.0), timeout_ms=AI_TIMEOUT_MAIN_MS)
        # Merge into a single system message when organic mode is enabled
        merged_system = (IVY_ORGANIC_SYSTEM_PROMPT + "\n\n" + SYSTEM_NARRATOR) if IVY_ORGANIC_ENABLED else SYSTEM_NARRATOR
        # Include short-memory when organic is enabled
        short_ctx = ""
        if IVY_ORGANIC_ENABLED:
            try:
                sid = facts.get("session_id") or facts.get("lead", {}).get("uid") or facts.get("person") or "global"
                short_ctx = get_condensed_context(str(sid))
            except Exception:
                short_ctx = ""
        human_payload = f"Mode: {mode}\nFACTS (JSON):\n```json\n{json.dumps(facts, ensure_ascii=False)}\n```"
        if short_ctx:
            human_payload += f"\n\nConversation so far (sanitised):\n{short_ctx}"
        messages = [
            ("system", merged_system),
            ("human", human_payload)
        ]
        text = await llm.ainvoke(messages)
        from app.ai.post import clamp_lines
        clamped_text = clamp_lines(text, 10, 800)
        CACHE.set(k, clamped_text)
        return clamped_text
    except Exception as e:
        logger.error("LLM call failed: %s", e)
        # Fallback to a short paragraph without rigid sections
        parts = []
        who = facts.get("person") or facts.get("query") or "this lead"
        status = facts.get("status") or facts.get("funnel", {}).get("status") if isinstance(facts.get("funnel"), dict) else None
        course = facts.get("course") or facts.get("course_interest") or facts.get("academic", {}).get("course") if isinstance(facts.get("academic"), dict) else None
        touchpoints = facts.get("touchpoints")
        fragment = f"Here's a quick view on {who}."
        if course:
            fragment += f" Interested in {course}."
        if status:
            fragment += f" Status: {status}."
        if isinstance(touchpoints, (int, float)) and touchpoints:
            fragment += f" {int(touchpoints)} recent touchpoints."
        parts.append(fragment)
        return " ".join(parts).strip()

async def narrate_triage_bullets(item: Dict[str,Any]) -> str:
    llm = LLMCtx(model="gemini-2.0-flash", temperature=0.2)
    out = await llm.ainvoke([("system", SYSTEM_TRIAGE_EXPLAIN),
                             ("human", f"FACTS:\n{json.dumps(item, ensure_ascii=False)}\nReturn 2 bullets.")])
    return out or "- Scored via engagement/recency\n- Watch consent/source quality"
