from __future__ import annotations

import os
import time
from typing import Any, Dict

from app.db.db import execute


AI_TELEMETRY_ENABLED = os.getenv("AI_TELEMETRY_ENABLED", "true").lower() in ("1", "true", "yes", "on")


async def log_ai_event(action: str, meta: Dict[str, Any] | None = None, started_at_ms: int | None = None):
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


