"""
AI Router API Endpoint
Exposes the multi-step AI router as a FastAPI endpoint
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging
import time
import statistics
import os
from collections import deque

from app.ai.router import router_instance, RouterRequest, RouterResponse
from app.ai import IVY_ORGANIC_ENABLED
from app.ai.ui_models import IvyConversationalResponse, IvyModalResponse, UIAction
from app.ai.actions import normalise_actions
from app.routers.rag import SuggestionsQuery, generate_suggestions_response
from typing import Optional

logger = logging.getLogger(__name__)

# Latency tracking for v2 router
_latency_buffer = deque(maxlen=100)  # Rolling window of last 100 requests
_p95_threshold_ms = 2000  # 2 seconds
_p99_threshold_ms = 5000  # 5 seconds
_warn_window_minutes = 5
_last_warn_time = 0

router = APIRouter(prefix="/ai/router", tags=["AI Router"])

def _is_modal_intent(q: str) -> Optional[str]:
    ql = (q or "").lower()
    if any(k in ql for k in ["next best action", "nba", "likelihood", "probability", "forecast"]):
        return "suggestions"
    if any(k in ql for k in ["profile card", "profile modal", "open profile"]):
        return "lead_profile"
    if ("risk" in ql) or ("red flag" in ql):
        return "risks"
    return None

def _check_latency_warnings():
    """Check rolling latency percentiles and warn if thresholds exceeded."""
    global _last_warn_time
    
    if len(_latency_buffer) < 10:  # Need minimum samples
        return
        
    current_time = time.time()
    if current_time - _last_warn_time < _warn_window_minutes * 60:
        return  # Don't spam warnings
        
    try:
        latencies = list(_latency_buffer)
        p95 = statistics.quantiles(latencies, n=20)[18]  # 95th percentile
        p99 = statistics.quantiles(latencies, n=100)[98]  # 99th percentile
        
        if p95 > _p95_threshold_ms or p99 > _p99_threshold_ms:
            logger.warning(
                "AI router v2 latency exceeded thresholds: p95=%.0fms (threshold=%dms), p99=%.0fms (threshold=%dms)",
                p95, _p95_threshold_ms, p99, _p99_threshold_ms
            )
            _last_warn_time = current_time
    except Exception as e:
        logger.debug(f"Latency warning check failed: {e}")


@router.post("/", response_model=RouterResponse)
async def route_query(request: RouterRequest) -> RouterResponse:
    """
    Main AI router endpoint - routes queries to appropriate AI models
    and returns structured responses with actions
    """
    try:
        t0 = time.time()
        logger.info(f"Routing query: {request.query[:100]}...")
        
        # Route the query through the AI router
        response = await router_instance.route(request.query, request.context)
        
        # Normalize actions to what the FE understands
        KNOWN_ACTIONS = {"open_call_console","open_email_composer","open_meeting_scheduler","view_profile"}
        
        def _map_action(a):
            a = (a or "").lower().replace("-", "_")
            # Allow legacy aliases but normalise to canonical four
            if a in ("open_chat", "open_profile"): a = "view_profile" if a == "open_profile" else "open_call_console"
            if a in KNOWN_ACTIONS: return a
            if "profile" in a: return "view_profile"
            if "email" in a: return "open_email_composer"
            if "meeting" in a or "book" in a: return "open_meeting_scheduler"
            return "open_call_console"
        
        # Centralised action normalisation (adds a sensible default if empty)
        response.actions = normalise_actions(response.actions)

        # Belt & braces: never return an empty answer
        if not (response.answer_markdown or "").strip():
            response.answer_markdown = (
                "I can help with that. While I gather more context, you can:\n\n"
                "• View the profile to see recent activity\n"
                "• Send a follow-up email or book a 1-1"
            )
        
        dt = int((time.time() - t0) * 1000)
        try:
            lead_preview = request.context.get("lead", {}) if isinstance(request.context, dict) else {}
            lead_preview = {k: lead_preview.get(k) for k in ("name","status","courseInterest","leadScore") if k in lead_preview}
        except Exception:
            lead_preview = {}
        logger.info(
            "AI router trace: %s",
            {
                "sid": getattr(router_instance, "session_id", "unknown"),
                "intent": response.intent,
                "confidence": response.confidence,
                "latency_ms": dt,
                "lead_preview": lead_preview,
                "steps": ["router_v1"],
            },
        )
        return response
    except Exception as e:
        logger.error(f"Router error: {str(e)}")
        # Always return something, even on error
        return RouterResponse(
            intent="unknown",
            confidence=0.3,
            answer_markdown=f"I encountered an error processing your request: {str(e)}. Please try rephrasing your question.",
            actions=[],
            sources=[],
            telemetry={"routed_to": ["error"], "error": str(e)},
            session_id="error"
        )

@router.post("/v2")
async def route_query_v2(request: RouterRequest):
    """Dual-mode: returns IvyConversationalResponse or IvyModalResponse envelopes."""
    t0 = time.time()
    kind = "conversational"
    intent = "unknown"
    kb_top_score = 0.0
    
    try:
        # Modal heuristic first (feature-gated)
        modal_type = _is_modal_intent(request.query)
        if modal_type and IVY_ORGANIC_ENABLED:
            # Check if we have sufficient signals for modal
            lead = (request.context or {}).get("lead", {}) if isinstance(request.context, dict) else {}
            has_signals = bool((lead.get("aiInsights") or {}).get("conversionProbability")) or \
                          bool(lead.get("leadScore")) or \
                          bool((request.context or {}).get("triage") or (request.context or {}).get("forecast"))
            
            if has_signals:
                kind = "modal"
                sreq = SuggestionsQuery(query=request.query, lead=lead)
                modal_payload = await generate_suggestions_response(sreq)
                actions = [UIAction(**a) for a in normalise_actions([modal_payload.get("ui", {}).get("primary_cta")]) if a]
                response = IvyModalResponse(modal={"type": "suggestions", "payload": modal_payload}, actions=actions)
            else:
                # Force conversational when no signals
                modal_type = None
        
        if not modal_type:
            # Conversational default via existing router
            legacy = await route_query(request)
            intent = getattr(legacy, 'intent', 'unknown')
            # Extract top KB score if available
            if hasattr(legacy, 'sources') and legacy.sources:
                try:
                    kb_top_score = max(float(s.get('similarity_score', 0)) for s in legacy.sources if isinstance(s, dict))
                except (ValueError, TypeError):
                    kb_top_score = 0.0
            
            # Envelope guards: trim answer, cap sources
            answer = (legacy.answer_markdown or "").strip()
            sources = (legacy.sources or None)
            if sources:
                try:
                    sources = list(sources)[:3]
                except Exception:
                    sources = None
            # If empty answer, inject short helpful default and at most one action via normaliser
            actions = [UIAction(**a) for a in normalise_actions(legacy.actions)]
            if not answer:
                answer = (
                    "I can help with that. While I gather more context, you can:\n\n"
                    "• View the profile to see recent activity\n"
                    "• Send a follow-up email or book a 1-1"
                )
                # Keep only one action (normalise_actions already ensures at least one)
                actions = actions[:1]

            response = IvyConversationalResponse(
                answer_markdown=answer,
                actions=actions,
                sources=sources,
            )
        
        # Record latency and update rolling buffer
        latency_ms = int((time.time() - t0) * 1000)
        _latency_buffer.append(latency_ms)
        
        # Check for performance warnings
        _check_latency_warnings()
        
        # Log telemetry with WARN if thresholds exceeded
        actions_count = len(getattr(response, 'actions', []))
        
        # Check if we should warn about latency
        warn_msg = None
        if latency_ms > _p95_threshold_ms:
            warn_msg = f"p95>{_p95_threshold_ms}ms"
        elif latency_ms > _p99_threshold_ms:
            warn_msg = f"p99>{_p99_threshold_ms}ms"
        
        # Get model provider for metrics
        model_provider = os.getenv("AI_MODEL_PROVIDER", "unknown")
        
        if warn_msg:
            logger.warning(
                "AI router v2 trace: kind=%s intent=%s latency_ms=%d kb_top_score=%.3f actions_count=%d model_provider=%s warn=%s",
                kind, intent, latency_ms, kb_top_score, actions_count, model_provider, warn_msg
            )
        else:
            logger.info(
                "AI router v2 trace: kind=%s intent=%s latency_ms=%d kb_top_score=%.3f actions_count=%d model_provider=%s",
                kind, intent, latency_ms, kb_top_score, actions_count, model_provider
            )
        
        # Add tracing headers for easy debugging (skip for now to avoid errors)
        # TODO: Add headers support to response models
        
        return response
        
    except Exception as e:
        latency_ms = int((time.time() - t0) * 1000)
        _latency_buffer.append(latency_ms)
        logger.error(f"Router v2 error: {str(e)}")
        
        # Return safe fallback
        return IvyConversationalResponse(
            answer_markdown=f"I encountered an error: {str(e)}. Please try rephrasing your question.",
            actions=[UIAction(label="View profile", action="view_profile")],
            sources=None,
        )

@router.get("/health")
async def health_check():
    """Health check for the AI router"""
    try:
        # Prefer an explicit attribute if the router exposes one
        intents_supported = len(getattr(router_instance, "INTENTS", [])) \
            or len(getattr(router_instance, "handlers", {}) or {})
    except Exception:
        intents_supported = 0
    return {
        "status": "healthy",
        "router": "ai_router",
        "intents_supported": intents_supported,
        "version": "1.0.0"
    }
