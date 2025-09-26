from __future__ import annotations

from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field


class UIAction(BaseModel):
    label: str
    action: Literal[
        "open_call_console",
        "open_email_composer",
        "open_meeting_scheduler",
        "view_profile",
    ]


class MaybeModal(BaseModel):
    type: str
    payload: Dict[str, Any]


class IvyConversationalResponse(BaseModel):
    kind: Literal["conversational"] = "conversational"
    answer_markdown: str
    actions: List[UIAction] = Field(default_factory=list)
    maybe_modal: Optional[MaybeModal] = None
    sources: Optional[List[Dict[str, Any]]] = None


class IvyModalResponse(BaseModel):
    kind: Literal["modal"] = "modal"
    modal: Dict[str, Any]
    actions: List[UIAction] = Field(default_factory=list)


