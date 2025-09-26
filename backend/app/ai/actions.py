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
        # Enhanced alias mapping
        alias_map = {
            "meeting": ["meeting", "meet", "1-1", "one to one", "appointment", "schedule", "book time", "book a call"],
            "email": ["email", "compose", "draft", "follow-up", "follow up", "write"],
            "profile": ["profile", "open card", "profile card", "open profile"],
        }
        
        al = a.replace("_", " ").strip()
        if any(w in al for w in alias_map["meeting"]):
            a = "open_meeting_scheduler"
        elif any(w in al for w in alias_map["email"]):
            a = "open_email_composer"
        elif any(w in al for w in alias_map["profile"]):
            a = "view_profile"
        elif "profile" in a:
            a = "view_profile"
        elif "email" in a:
            a = "open_email_composer"
        elif ("meeting" in a) or ("book" in a):
            a = "open_meeting_scheduler"
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
    # Provide a sensible default if empty
    if not result:
        result = [{"label": "Open Call Console", "action": "open_call_console"}]
    return result


