from pydantic import BaseModel
from pydantic.networks import EmailStr
from typing import Optional, Any, Literal
from datetime import datetime, date
from uuid import UUID
from fastapi import HTTPException

class PersonOut(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    lifecycle_state: str
    created_at: datetime

class PeoplePage(BaseModel):
    items: list[PersonOut]
    next_cursor: Optional[str] = None

# New schemas for updates
class PersonUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    programme: Optional[str] = None
    lifecycle_state: Optional[str] = None

class LeadUpdate(BaseModel):
    lead_score: Optional[int] = None
    conversion_probability: Optional[float] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None  # e.g., 'contacted', 'qualified', 'unqualified'
    next_follow_up: Optional[datetime] = None

class LeadNote(BaseModel):
    note: str
    note_type: str = "general"  # e.g., "call", "email", "meeting", "general"
    created_by: Optional[str] = None

# Shared policy for read-only system fields
SYSTEM_FIELDS = {"id", "org_id", "created_at", "updated_at", "external_ref"}

def assert_no_system_fields(payload: dict):
    illegal = SYSTEM_FIELDS.intersection(payload.keys())
    if illegal:
        raise HTTPException(status_code=422, detail=f"Read-only system fields: {sorted(illegal)}")


class PropertyUpdate(BaseModel):
    property_id: Optional[UUID] = None
    property_name: Optional[str] = None
    data_type: Literal["text","number","boolean","date","phone","json"]
    value: Any