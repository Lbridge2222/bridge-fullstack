"""
AI Interaction Telemetry
Tracks AI response quality, normalization, and user interactions
"""

import time
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
from app.db.db import execute
from app.ai.pii_redaction import redact

async def log_normalise(request_id: str, raw: str, normalised: str, edits_count: int, latency: float, ok: bool):
    """Log text normalization results"""
    try:
        await execute("""
            INSERT INTO ivy_ai_telemetry 
            (request_id, route, raw_text, normalized_text, parser_ok, latency_ms, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, request_id, "normalize", redact(raw), redact(normalised), ok, int(latency * 1000), datetime.utcnow())
    except Exception:
        pass  # Don't fail on telemetry

async def log_intent(request_id: str, intent_type: str, confidence: float, used_person_ctx: bool):
    """Log intent classification results"""
    try:
        await execute("""
            INSERT INTO ivy_ai_telemetry 
            (request_id, route, intent, parser_ok, created_at)
            VALUES ($1, $2, $3, $4, $5)
        """, request_id, "intent", intent_type, confidence > 0.7, datetime.utcnow())
    except Exception:
        pass

async def log_retrieval(request_id: str, k: int, top_scores: List[float], mean_score: float, gap_flag: bool):
    """Log retrieval quality metrics"""
    try:
        await execute("""
            INSERT INTO ivy_ai_telemetry 
            (request_id, route, result_count, parser_ok, created_at)
            VALUES ($1, $2, $3, $4, $5)
        """, request_id, "retrieval", k, not gap_flag, datetime.utcnow())
    except Exception:
        pass

async def log_narration(request_id: str, tokens_out: int, sections_present: List[str], length_chars: int):
    """Log narration generation metrics"""
    try:
        await execute("""
            INSERT INTO ivy_ai_telemetry 
            (request_id, route, result_count, parser_ok, created_at)
            VALUES ($1, $2, $3, $4, $5)
        """, request_id, "narration", length_chars, len(sections_present) > 0, datetime.utcnow())
    except Exception:
        pass

async def log_modal(request_id: str, name: str, opened: bool, actions_clicked: int):
    """Log modal interactions"""
    try:
        await execute("""
            INSERT INTO ivy_ai_telemetry 
            (request_id, route, parser_ok, result_count, created_at)
            VALUES ($1, $2, $3, $4, $5)
        """, request_id, f"modal_{name}", opened, actions_clicked, datetime.utcnow())
    except Exception:
        pass
