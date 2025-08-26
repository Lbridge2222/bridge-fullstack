from __future__ import annotations

import os
import time
import re
from typing import Any, Dict

from app.db.db import execute


AI_TELEMETRY_ENABLED = os.getenv("AI_TELEMETRY_ENABLED", "true").lower() in ("1", "true", "yes", "on")


def redact_pii(text: str | None) -> str | None:
    """
    Redact PII from text before storing in telemetry.
    Redacts names, emails, phones, and other sensitive data.
    """
    if not text:
        return text
    
    # Redact email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    
    # Redact phone numbers (various formats)
    text = re.sub(r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b', '[PHONE]', text)
    
    # Redact names (common patterns like "John Smith" or "Smith, John")
    text = re.sub(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', '[NAME]', text)
    text = re.sub(r'\b[A-Z][a-z]+, [A-Z][a-z]+\b', '[NAME]', text)
    
    # Redact UUIDs (keep format but redact content)
    text = re.sub(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '[UUID]', text)
    
    return text


async def log_ai_event(action: str, meta: Dict[str, Any] | None = None, started_at_ms: int | None = None):
    """Legacy function for backward compatibility"""
    if not AI_TELEMETRY_ENABLED:
        return
    try:
        payload = meta or {}
        await execute(
            "insert into ai_events(action, meta) values (%s, %s)",
            action,
            payload,
        )
    except Exception:
        # best-effort; don't raise
        pass


async def log_ai_event_extended(
    action: str, 
    meta: Dict[str, Any] | None = None, 
    raw_prompt: str | None = None,
    raw_response: str | None = None,
    confidence: float | None = None,
    reason_codes: list[str] | None = None,
    started_at_ms: int | None = None
):
    """
    Enhanced AI event logging with PII redaction and detailed tracking.
    Stores both raw and redacted versions for transparency.
    """
    if not AI_TELEMETRY_ENABLED:
        return
    
    try:
        # Prepare the enhanced payload
        enhanced_meta = meta or {}
        if confidence is not None:
            enhanced_meta["confidence"] = confidence
        if reason_codes:
            enhanced_meta["reason_codes"] = reason_codes
        if started_at_ms:
            enhanced_meta["started_at_ms"] = started_at_ms
        
        # Try to insert with enhanced columns first
        try:
            await execute(
                """
                INSERT INTO ai_events(
                    action, meta, raw_prompt, redacted_prompt, 
                    raw_response, redacted_response, confidence, reason_codes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                action,
                enhanced_meta,
                raw_prompt,
                redact_pii(raw_prompt) if raw_prompt else None,
                raw_response,
                redact_pii(raw_response) if raw_response else None,
                confidence,
                reason_codes,
            )
        except Exception:
            # Fallback to basic logging if enhanced columns don't exist
            await execute(
                "INSERT INTO ai_events(action, meta) VALUES (%s, %s)",
                action,
                enhanced_meta,
            )
            
    except Exception:
        # best-effort; don't raise
        pass


