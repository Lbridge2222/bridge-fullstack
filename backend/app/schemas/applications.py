from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID

class ApplicationCard(BaseModel):
    application_id: UUID
    stage: str
    status: str
    source: Optional[str] = None
    sub_source: Optional[str] = None
    assignee_user_id: Optional[UUID] = None
    created_at: datetime
    priority: Optional[str] = None
    urgency: Optional[str] = None
    urgency_reason: Optional[str] = None
    person_id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    lead_score: Optional[int] = None
    conversion_probability: Optional[float] = None
    programme_name: str
    programme_code: Optional[str] = None
    campus_name: Optional[str] = None
    cycle_label: str
    days_in_pipeline: Optional[int] = None
    sla_overdue: bool
    has_offer: bool
    has_active_interview: bool
    last_activity_at: Optional[datetime] = None
    offer_type: Optional[str] = None


class StageMoveIn(BaseModel):
    to_stage: str
    changed_by: Optional[UUID] = None
    note: Optional[str] = None


class StageMoveOut(BaseModel):
    application_id: UUID
    from_stage: str
    to_stage: str

