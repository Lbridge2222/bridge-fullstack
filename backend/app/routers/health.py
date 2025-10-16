from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
import asyncio
import logging
from datetime import datetime, timedelta
from collections import deque

log = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])

# In-memory status tracking (in production, use Redis or similar)
llm_status_history = deque(maxlen=10)
llm_last_status = "unknown"
llm_attempts = 0
model_used = None

def update_llm_status(status: str, attempts: int = 0, model: str = None):
    """Update LLM status for monitoring"""
    global llm_last_status, llm_attempts, model_used
    llm_last_status = status
    llm_attempts = attempts
    model_used = model
    
    llm_status_history.append({
        "timestamp": datetime.utcnow().isoformat(),
        "status": status,
        "attempts": attempts,
        "model": model
    })

@router.get("/llm")
async def llm_health() -> Dict[str, Any]:
    """LLM health check endpoint"""
    try:
        # Quick LLM test
        from app.ai.safe_llm import LLMCtx
        llm = LLMCtx()
        
        start_time = datetime.utcnow()
        response = await llm.ainvoke("Test")
        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return {
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "last_status": llm_last_status,
            "last_attempts": llm_attempts,
            "model_used": model_used,
            "recent_statuses": list(llm_status_history),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        log.error("LLM health check failed: %s", e)
        return {
            "status": "unhealthy",
            "error": str(e),
            "last_status": llm_last_status,
            "last_attempts": llm_attempts,
            "model_used": model_used,
            "recent_statuses": list(llm_status_history),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/router")
async def router_health() -> Dict[str, Any]:
    """Router health check with stage breakdown"""
    try:
        from app.ai.router import AIRouter
        from app.ai.feature_flags import feature_flags
        
        router = AIRouter()
        
        # Test basic routing
        start_time = datetime.utcnow()
        response = await router.route("test query", {})
        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return {
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "intent_classification": "working",
            "feature_flags": feature_flags.get_all_flags(),
            "timeout_config": feature_flags.get_timeout_config(),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        log.error("Router health check failed: %s", e)
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
