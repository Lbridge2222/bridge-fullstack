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