from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import Any, Dict
import time

from app.ai import AI_LEADS_ENABLED
from app.ai.tools.leads import sql_query_leads, compose_outreach as compose_outreach_tool, LeadLite, _rule_score
from app.telemetry import log_ai_event


router = APIRouter(prefix="/ai/leads", tags=["ai/leads"])


@router.post("/triage")
async def triage(payload: Dict[str, Any]):
    if not AI_LEADS_ENABLED:
        raise HTTPException(status_code=404, detail="AI leads is disabled")
    filters = payload.get("filters", {})
    t0 = time.time()
    
    try:
        # Simple rules-based scoring for now
        leads = await sql_query_leads(filters)
        scored = []
        for lead in leads:
            score, reasons, next_action = _rule_score(lead)
            scored.append({
                "id": lead.id,
                "score": round(score, 1),
                "reasons": reasons,
                "next_action": next_action
            })
        # Sort by score desc
        scored.sort(key=lambda x: x["score"], reverse=True)
        
        # Extract top reasons from the scored leads
        all_reasons = []
        for item in scored:
            all_reasons.extend(item["reasons"])
        
        # Get most common reasons
        from collections import Counter
        reason_counts = Counter(all_reasons)
        top_reasons = [reason for reason, count in reason_counts.most_common(3)]
        
        summary = {
            "cohort_size": len(leads),
            "top_reasons": top_reasons if top_reasons else ["High lead scores", "Recent activity", "Strong engagement"]
        }
        
        ms = int((time.time() - t0) * 1000)
        await log_ai_event("leads.triage", {"rows": len(scored), "latency_ms": ms})
        return {"summary": summary, "items": scored, "latency_ms": ms}
        
    except Exception as e:
        # Ultimate fallback
        print(f"AI triage error: {e}")
        return {
            "summary": {"cohort_size": 0, "top_reasons": ["System error"]},
            "items": [],
            "latency_ms": int((time.time() - t0) * 1000)
        }


@router.post("/explain-selection")
async def explain_selection(payload: Dict[str, Any]):
    if not AI_LEADS_ENABLED:
        raise HTTPException(status_code=404, detail="AI leads is disabled")
    # Placeholder: summarize filters only
    filters = payload.get("filters", {})
    return {"answer": f"Explaining current selection with filters: {filters}"}


@router.post("/compose/outreach")
async def compose_outreach_ep(payload: Dict[str, Any]):
    if not AI_LEADS_ENABLED:
        raise HTTPException(status_code=404, detail="AI leads is disabled")
    intent = payload.get("intent", "nurture")
    lead_ids = payload.get("lead_ids") or []
    filters = payload.get("filters") or {}
    leads: list[LeadLite]
    if lead_ids:
        # Minimal fetch: use existing view and filter by ids (string uuid/text)
        rows = await pg_fetch_ids(lead_ids)
        leads = [LeadLite(**r) for r in rows]
    else:
        leads = await sql_query_leads(filters)
    t0 = time.time()
    draft = await compose_outreach_tool(leads, intent)
    ms = int((time.time() - t0) * 1000)
    await log_ai_event("compose.outreach", {"rows": len(leads), "latency_ms": ms, "intent": intent})
    return draft


async def pg_fetch_ids(ids: list[str]):
    # Helper: fetch minimal fields by id from the same view
    if not ids:
        return []
    placeholders = ",".join(["%s"] * len(ids))
    sql = f"""
        SELECT id::text as id,
               trim(coalesce(first_name,'')||' '||coalesce(last_name,'')) as name,
               email,
               NULL::text as campus,
               NULL::text as course,
               coalesce(lead_score,0) as lead_score,
               created_at as last_activity_at
        FROM vw_leads_management
        WHERE id::text IN ({placeholders})
        LIMIT 200
    """
    from app.db.db import fetch as _fetch
    return await _fetch(sql, *ids)


