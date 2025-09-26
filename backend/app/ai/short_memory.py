from __future__ import annotations

from collections import deque
from typing import Deque, Dict, List, Tuple
import re
import time

from app.ai.privacy_utils import anonymise_body, safe_preview


# In-proc rolling buffers keyed by a session-like key
_BUFFERS: Dict[str, Deque[Tuple[str, str, float]]] = {}  # (role, text, timestamp)
_MAX_ITEMS = 12  # ~6 turns (user+assistant)

# Decay weights for conversation history [1.0, 0.6, 0.3, 0.1, 0.05, 0.02]
_DECAY_WEIGHTS = [1.0] + [0.6 ** i for i in range(1, 6)]

# Few-shot style examples (rotate weekly)
_STYLE_SHOTS = [
    "Keep responses concise and professional. Use British English spelling.",
    "Focus on course-specific information and application guidance.",
    "Be helpful but maintain appropriate boundaries for personal questions."
]
_CURRENT_STYLE_INDEX = 0
_LAST_STYLE_ROTATION = 0


def _sanitize_text(text: str) -> str:
    """Remove emails/phones; preserve [S#] lines via anonymise_body."""
    t = anonymise_body(text or "", enabled=True)
    # Basic email/phone scrubbing
    t = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[redacted]", t)
    t = re.sub(r"\b\+?\d[\d\s().-]{6,}\b", "[redacted]", t)
    return t.strip()


def _rotate_style_shot():
    """Rotate style shot weekly."""
    global _CURRENT_STYLE_INDEX, _LAST_STYLE_ROTATION
    current_time = time.time()
    week_in_seconds = 7 * 24 * 60 * 60
    
    if current_time - _LAST_STYLE_ROTATION > week_in_seconds:
        _CURRENT_STYLE_INDEX = (_CURRENT_STYLE_INDEX + 1) % len(_STYLE_SHOTS)
        _LAST_STYLE_ROTATION = current_time


def add_turn(key: str, role: str, text: str) -> None:
    buf = _BUFFERS.setdefault(key, deque(maxlen=_MAX_ITEMS))
    buf.append((role, _sanitize_text(text), time.time()))


def get_condensed_context(key: str, max_turns: int = 6, max_chars: int = 600) -> str:
    buf = _BUFFERS.get(key)
    if not buf:
        return ""
    
    # Rotate style shot if needed
    _rotate_style_shot()
    
    # Take the last N items with decay weighting
    items: List[Tuple[str, str, float]] = list(buf)[-max_turns:]
    lines: List[str] = []
    
    # Add style guidance
    lines.append(f"Style: {_STYLE_SHOTS[_CURRENT_STYLE_INDEX]}")
    
    for i, (role, text, timestamp) in enumerate(items):
        if not text:
            continue
        
        # Apply decay weight
        weight = _DECAY_WEIGHTS[i] if i < len(_DECAY_WEIGHTS) else 0.01
        if weight < 0.1:  # Skip very low weight items
            continue
            
        snippet = text[:200]
        lines.append(f"{role}: {snippet}")
    
    out = "\n".join(lines)
    return out[:max_chars]


def get_context_for_narrate(key: str, current_lead_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get context formatted for narrate() with decay weighting and style guidance."""
    buf = _BUFFERS.get(key)
    if not buf:
        return []
    
    # Rotate style shot if needed
    _rotate_style_shot()
    
    context_messages = []
    
    # Add current lead data as a system message if available
    if current_lead_data:
        preview = safe_preview(current_lead_data)
        if preview:
            context_messages.append({"role": "system", "content": f"Current lead context: {preview}"})
    
    # Add style guidance
    context_messages.append({
        "role": "system", 
        "content": f"Style guidance: {_STYLE_SHOTS[_CURRENT_STYLE_INDEX]}"
    })

    # Add conversation history with decay weighting
    items = list(buf)[-6:]  # Last 6 turns
    for i, (role, text, timestamp) in enumerate(items):
        weight = _DECAY_WEIGHTS[i] if i < len(_DECAY_WEIGHTS) else 0.01
        if weight > 0.1:  # Only include messages with significant weight
            context_messages.append({
                "role": role,
                "content": text,
                "weight": weight  # Include weight for potential use by LLM
            })
    
    return context_messages


def clear(key: str | None = None) -> None:
    if key is None:
        _BUFFERS.clear()
    else:
        _BUFFERS.pop(key, None)


