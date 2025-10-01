from __future__ import annotations

from typing import Any, Dict, List

CANONICAL_ACTIONS = {
    "open_call_console",
    "open_email_composer",
    "open_meeting_scheduler",
    "view_profile",
}

def normalise_action(action: str | Dict[str, Any]) -> Dict[str, str] | None:
    if isinstance(action, dict):
        if (action.get("type") or "").upper() == "CHIP":
            return None
        label = action.get("label")
        a = (action.get("action") or "").lower().replace("-", "_")
    else:
        label = None
        a = (action or "").lower().replace("-", "_")

    if a in ("open_chat", "open_profile"):
        a = "view_profile" if a == "open_profile" else "open_call_console"

    if a not in CANONICAL_ACTIONS:
        # Enhanced alias mapping with tokenized matching
        import re
        
        # Tokenize the action string for better matching
        al = a.replace("_", " ").strip()
        tokens = set(re.findall(r"[a-z0-9+-]+", al.lower()))
        
        # Check explicit patterns with tokenized matching
        if {"zoom","teams","calendar"} & tokens or "1-1" in al or {"book","schedule","arrange","set"} & tokens:
            a = "open_meeting_scheduler"
        elif {"email","compose","draft","follow","follow-up","template"} & tokens or "drop a line" in al:
            a = "open_email_composer"
        elif "profile" in tokens:
            a = "view_profile"
        else:
            a = "open_call_console"

    if not label:
        label = (
            "View profile" if a == "view_profile" else
            "Book meeting" if a == "open_meeting_scheduler" else
            "Send email" if a == "open_email_composer" else
            "Open Call Console"
        )

    return {"label": label, "action": a}

def normalise_actions(actions: List[Any] | None) -> List[Dict[str, str]]:
    result: List[Dict[str, str]] = []
    for a in (actions or []):
        norm = normalise_action(a)
        if norm:
            result.append(norm)
    # Return empty list if no valid actions (let the UI decide if it needs a default)
    return result


