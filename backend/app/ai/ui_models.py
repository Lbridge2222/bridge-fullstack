from __future__ import annotations

from typing import Any, Dict, List, Optional, Literal, Union
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


class ContentContract(BaseModel):
    """Content contract specifying required format and content requirements"""
    mode: Literal["guidance", "apel", "policy", "profile", "nba", "admissions", "privacy", "general", "update", "objection"]
    course: Optional[str] = None
    must: List[str] = Field(default_factory=list)
    context: Optional[Dict[str, Any]] = None
    suggestions_data: Optional[Dict[str, Any]] = None  # Raw suggestions data for NBA rewriter
    audience: str = "agent"  # Target audience for content generation


class IvyConversationalResponse(BaseModel):
    kind: Literal["conversational"] = "conversational"
    answer_markdown: str
    actions: List[UIAction] = Field(default_factory=list)
    maybe_modal: Optional[MaybeModal] = None
    sources: Optional[List[Dict[str, Any]]] = None
    content_contract: Optional[ContentContract] = None


class IvyModalResponse(BaseModel):
    kind: Literal["modal"] = "modal"
    modal: Dict[str, Any]
    actions: List[UIAction] = Field(default_factory=list)


