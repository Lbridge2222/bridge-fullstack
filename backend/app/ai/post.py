"""
Post-processing utilities for AI responses
"""

def clamp_list(items, max_len, max_chars):
    """Clamp list items to max length and character count"""
    out = [(str(x)[:max_chars]).strip() for x in (items or [])]
    return out[:max_len]

def clamp_lines(text: str, max_lines: int, max_len: int = 300) -> str:
    """Clamp text to max lines and character count per line"""
    if not text: return text
    lines = [l.strip() for l in str(text).splitlines() if l.strip()]
    lines = lines[:max_lines]
    return "\n".join(l if len(l) <= max_len else (l[:max_len-1] + "…") for l in lines)