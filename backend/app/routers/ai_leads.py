from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import Any, Dict
import time

from app.ai import AI_LEADS_ENABLED
from app.ai.tools.leads import sql_query_leads, compose_outreach as compose_outreach_tool, LeadLite, _rule_score
from app.ai.tools.score_explanations import calculate_score_breakdown, score_breakdown_to_dict
from app.telemetry import log_ai_event, log_ai_event_extended


router = APIRouter(prefix="/ai/leads", tags=["ai/leads"])


@router.post("/triage")
async def triage(payload: Dict[str, Any]):
    if not AI_LEADS_ENABLED:
        raise HTTPException(status_code=404, detail="AI leads is disabled")
    filters = payload.get("filters", {})
    t0 = time.time()
    
    try:
        # Use AI-enhanced triage if available, otherwise fall back to rules
        leads = await sql_query_leads(filters)
        
        try:
            # Try AI-enhanced triage first
            from app.ai.tools.leads import leads_triage
            scored = await leads_triage(leads)
            print("🤖 AI triage completed successfully")
        except Exception as e:
            print(f"⚠️ AI triage failed: {e}, falling back to rules-only")
            # Fallback to rules-only scoring
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


@router.post("/explain-score")
async def explain_score(payload: Dict[str, Any]):
    """
    Explain the score breakdown for a specific lead.
    Returns detailed factor analysis with weights, contributions, and reason codes.
    """
    if not AI_LEADS_ENABLED:
        raise HTTPException(status_code=404, detail="AI leads is disabled")
    
    lead_id = payload.get("lead_id")
    if not lead_id:
        raise HTTPException(status_code=400, detail="lead_id is required")
    
    t0 = time.time()
    
    try:
        # Fetch the specific lead data
        from app.db.db import fetch as pg_fetch
        
        # Get lead data from the enriched view
        sql = """
            SELECT 
                id::text,
                first_name,
                last_name,
                email,
                phone,
                lead_score,
                conversion_probability,
                created_at,
                updated_at,
                latest_programme_name,
                latest_campus_name,
                latest_academic_year,
                last_activity_at
            FROM vw_people_enriched
            WHERE id::text = %s
            LIMIT 1
        """
        
        rows = await pg_fetch(sql, lead_id)
        if not rows:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = rows[0]
        
        # Calculate score breakdown
        breakdown = calculate_score_breakdown(lead_data)
        result = score_breakdown_to_dict(breakdown)
        result["lead_id"] = lead_id
        
        # Enhanced telemetry logging
        ms = int((time.time() - t0) * 1000)
        reason_codes = [factor["reason_code"] for factor in result["breakdown"]]
        
        await log_ai_event_extended(
            action="leads.explain_score",
            meta={
                "lead_id": lead_id,
                "score": result["score"],
                "latency_ms": ms,
                "factor_count": len(result["breakdown"])
            },
            confidence=result["confidence"],
            reason_codes=reason_codes
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Score explanation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to explain score: {str(e)}")


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
    user_prompt = payload.get("user_prompt")
    content = payload.get("content")
    leads: list[LeadLite]
    if lead_ids:
        # Minimal fetch: use existing view and filter by ids (string uuid/text)
        rows = await pg_fetch_ids(lead_ids)
        leads = [LeadLite(**r) for r in rows]
    else:
        leads = await sql_query_leads(filters)
    t0 = time.time()
    draft = await compose_outreach_tool(leads, intent, user_prompt, content)
    ms = int((time.time() - t0) * 1000)
    await log_ai_event("compose.outreach", {"rows": len(leads), "latency_ms": ms, "intent": intent})
    return draft


@router.post("/predict-batch")
async def predict_batch_leads(payload: Dict[str, Any]):
    """
    Get ML predictions for a batch of lead IDs.
    Returns conversion probabilities and confidence scores.
    """
    if not AI_LEADS_ENABLED:
        raise HTTPException(status_code=404, detail="AI leads is disabled")
    
    lead_ids = payload.get("lead_ids", [])
    if not lead_ids:
        raise HTTPException(status_code=400, detail="lead_ids array is required")
    
    try:
        # Import the ML pipeline
        from app.ai.advanced_ml import AdvancedMLPipeline
        
        # Initialize the pipeline
        ml_pipeline = AdvancedMLPipeline()
        
        # Get predictions
        predictions = await ml_pipeline.predict_batch(lead_ids)
        
        return {
            "model_used": "random_forest_v1",
            "total_processed": len(lead_ids),
            "predictions": predictions.get("predictions", []),
            "metadata": {
                "model_version": "2025-08-27",
                "confidence_threshold": 0.7,
                "processing_time": predictions.get("processing_time", 0)
            }
        }
        
    except Exception as e:
        print(f"ML prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get predictions: {str(e)}")


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


