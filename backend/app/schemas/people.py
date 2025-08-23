from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID

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