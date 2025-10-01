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
        
        # Early guard for untracked personal questions - more precise patterns
        ql = (request.query or "").lower()
        import re
        
        # Skip privacy guard for APEL-related queries
        if "apel" in ql:
            pass  # Allow APEL queries through
        else:
            personal_patterns = [
                r"\b(are|is|do|does|have|has|what|who).*(boyfriend|girlfriend|married|religion|political views|pets?|dog|cat)\b",
                r"\b(do they|does.*have|are they).*(married|boyfriend|girlfriend|pets?|religion|political)\b"
            ]
            
            for pattern in personal_patterns:
                if re.search(pattern, ql, re.IGNORECASE):
                    from app.ai.text_sanitiser import cleanse_conversational
                    return RouterResponse(
                        answer_markdown=cleanse_conversational(
                            "We don't track personal details like that — let's focus on course fit, entry requirements and the next steps."
                        ),
                        actions=[{"label": "Open Call Console", "action": "open_call_console"}],
                        confidence=0.9,
                        intent="personal_untracked",
                        session_id=router_instance.session_id
                    )
        
        # Route the query through the AI router
        v1_response = await router_instance.route(request.query, request.context)
        
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
        actions = normalise_actions(v1_response.actions)
        
        # Belt & braces: never return an empty answer
        answer = v1_response.answer_markdown or ""
        if not answer.strip():
            answer = (
                "I can help with that. While I gather more context, you can:\n\n"
                "• View the profile to see recent activity\n"
                "• Send a follow-up email or book a 1-1"
            )
        
        # Return RouterResponse for legacy endpoint compatibility
        response = RouterResponse(
            answer_markdown=answer,
            actions=actions,
            sources=v1_response.sources or [],
            confidence=v1_response.confidence,
            intent=v1_response.intent,
            session_id=v1_response.session_id
        )
        
        dt = int((time.time() - t0) * 1000)
        try:
            lead_preview = request.context.get("lead", {}) if isinstance(request.context, dict) else {}
            lead_preview = {k: lead_preview.get(k) for k in ("name","status","courseInterest","leadScore","email","phone","source","touchpoint_count","last_engagement_date","latest_academic_year","conversion_probability","ai_insights","triage_score","forecast") if k in lead_preview}
        except Exception:
            lead_preview = {}
        logger.info(
            "AI router trace: %s",
            {
                "sid": getattr(router_instance, "session_id", "unknown"),
                "intent": v1_response.intent,
                "confidence": v1_response.confidence,
                "latency_ms": dt,
                "lead_preview": lead_preview,
                "steps": ["router_v1"],
            },
        )
        return response
    except Exception as e:
        logger.error(f"Router error: {str(e)}")
        # Always return something, even on error
        return IvyConversationalResponse(
            answer_markdown=f"I encountered an error processing your request: {str(e)}. Please try rephrasing your question.",
            actions=[{"label": "Open Call Console", "action": "open_call_console"}],
            sources=[]
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
                if modal_type == "suggestions":
                    sreq = SuggestionsQuery(query=request.query, lead=lead)
                    modal_payload = await generate_suggestions_response(sreq)
                    actions = [UIAction(label="View Suggestions", action="view_profile")]
                    response = IvyModalResponse(modal={"type": "suggestions", "payload": modal_payload}, actions=actions)
                elif modal_type == "risks":
                    # Generate risk assessment modal
                    modal_payload = {
                        "title": "Risk Assessment",
                        "summary": "Reviewing potential concerns and red flags",
                        "risks": [
                            {"type": "gdpr", "severity": "high", "description": "No GDPR opt-in consent"},
                            {"type": "engagement", "severity": "medium", "description": "Low touchpoint count"}
                        ],
                        "recommendations": ["Request GDPR consent", "Increase engagement touchpoints"]
                    }
                    actions = [UIAction(label="Send Consent Request", action="open_email_composer")]
                    response = IvyModalResponse(modal={"type": "risks", "payload": modal_payload}, actions=actions)
            else:
                # Force conversational when no signals
                modal_type = None
        
        if not modal_type:
            # Conversational default via existing router
            legacy = await router_instance.route(request.query, request.context)
            intent = getattr(legacy, 'intent', 'unknown')
            
            # DEBUG: Log the legacy response intent
            logger.info(f"V2 Router received from V1: intent={intent}, confidence={getattr(legacy, 'confidence', 'N/A')}, telemetry={getattr(legacy, 'telemetry', {})}")
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
            # Convert legacy actions to dictionaries if they're UIAction objects
            legacy_actions = []
            for action in (legacy.actions or []):
                if hasattr(action, 'label') and hasattr(action, 'action'):
                    # It's a UIAction object, convert to dict
                    legacy_actions.append({"label": action.label, "action": action.action})
                elif isinstance(action, dict):
                    # It's already a dict
                    legacy_actions.append(action)
                else:
                    # Skip unknown format
                    continue
            actions = [UIAction(**a) for a in normalise_actions(legacy_actions)]
            if not answer:
                answer = (
                    "I can help with that. While I gather more context, you can:\n\n"
                    "• View the profile to see recent activity\n"
                    "• Send a follow-up email or book a 1-1"
                )
                # Keep only one action (normalise_actions already ensures at least one)
                actions = actions[:1]

            # Contract enforcement is handled centrally in router._ok() method
            # No need to duplicate here since legacy responses already have contracts applied

            response = IvyConversationalResponse(
                answer_markdown=answer,
                actions=actions,
                sources=sources,
                content_contract=getattr(legacy, "content_contract", None),
            )
        
        # Record latency and update rolling buffer
        latency_ms = int((time.time() - t0) * 1000)
        _latency_buffer.append(latency_ms)
        
        # Check for performance warnings
        _check_latency_warnings()
        
        # Structured E2E telemetry for debugging
        logger.info("AI E2E: %s", {
            "endpoint": "router_v2",
            "intent": intent,
            "latency_ms": latency_ms,
            "kb_results": len(getattr(legacy, "sources", []) or []) if 'legacy' in locals() else 0,
            "kb_top": kb_top_score,
            "actions": [a.get("action") if isinstance(a, dict) else getattr(a, "action", None) for a in getattr(response, 'actions', [])],
            "empty_answer": not bool(getattr(response, 'answer_markdown', '').strip()),
            "lead_ctx": bool((request.context or {}).get("lead")),
            "model": os.getenv("AI_MODEL_PROVIDER", "unknown"),
            "kind": getattr(response, 'kind', 'unknown')
        })
        
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
        
        # Final style enforcement for conversational responses
        if response.kind == "conversational":
            # Skip sanitization if content contract was applied (already structured)
            contract_applied = getattr(legacy, "contract_applied", False)
            if not contract_applied:
                from app.ai.text_sanitiser import cleanse_conversational
                # Pass the intent from legacy to preserve structure
                legacy_intent = getattr(legacy, "intent", "unknown")
                extra = {"contract_applied": False}
                response.answer_markdown = cleanse_conversational(response.answer_markdown or "", intent=legacy_intent, extra=extra)
            else:
                # Contract was applied - use the already rewritten answer
                response.answer_markdown = legacy.answer_markdown
        
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
