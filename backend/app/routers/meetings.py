from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from ..db.db import fetch, execute, fetchrow
from ..schemas.people import PersonOut

router = APIRouter(prefix="/meetings", tags=["meetings"])

# Meeting schemas
from pydantic import BaseModel
from typing import Literal

class MeetingTypeCreate(BaseModel):
    name: str
    description: str
    duration_minutes: int
    type: Literal["consultation", "campus_tour", "interview", "follow_up", "general"]
    location: Literal["campus", "virtual", "phone", "hybrid"]
    max_participants: int
    requires_preparation: bool = False
    tags: List[str] = []

class MeetingTypeResponse(BaseModel):
    id: str
    name: str
    description: str
    duration_minutes: int
    type: str
    location: str
    max_participants: int
    requires_preparation: bool
    tags: List[str]

class MeetingSlotResponse(BaseModel):
    id: str
    date: str
    start_time: str
    end_time: str
    available: bool
    meeting_type_id: Optional[str] = None

class MeetingBookingCreate(BaseModel):
    lead_id: str
    meeting_type_id: str
    scheduled_start: datetime
    scheduled_end: datetime
    location: str
    participants: List[str]
    agenda: str
    preparation_notes: str
    reminder_settings: dict
    status: Literal["scheduled", "confirmed", "completed", "cancelled", "rescheduled"] = "scheduled"

class MeetingBookingResponse(BaseModel):
    id: str
    lead_id: str
    meeting_type: MeetingTypeResponse
    scheduled_start: datetime
    scheduled_end: datetime
    location: str
    participants: List[str]
    agenda: str
    preparation_notes: str
    reminder_settings: dict
    status: str
    created_at: datetime

# Mock data for now - replace with database queries
MEETING_TYPES = [
    {
        "id": "1",
        "name": "Application Interview",
        "description": "Assess fit and outline application steps",
        "duration_minutes": 30,
        "type": "interview",
        "location": "virtual",
        "max_participants": 2,
        "requires_preparation": True,
        "tags": ["interview", "application", "virtual"]
    },
    {
        "id": "2", 
        "name": "Course Consultation",
        "description": "Discuss course details & outcomes",
        "duration_minutes": 45,
        "type": "consultation",
        "location": "virtual",
        "max_participants": 3,
        "requires_preparation": True,
        "tags": ["course", "consultation"]
    },
    {
        "id": "3",
        "name": "Campus Tour",
        "description": "Facilities, accommodation, learning spaces",
        "duration_minutes": 60,
        "type": "campus_tour",
        "location": "campus",
        "max_participants": 5,
        "requires_preparation": False,
        "tags": ["campus", "tour"]
    },
    {
        "id": "4",
        "name": "Follow-up Call",
        "description": "Tidy up questions and next steps",
        "duration_minutes": 20,
        "type": "follow_up",
        "location": "phone",
        "max_participants": 2,
        "requires_preparation": False,
        "tags": ["follow-up", "phone"]
    }
]

def generate_available_slots(start_date: str, end_date: str) -> List[MeetingSlotResponse]:
    """Generate available meeting slots for the given date range"""
    slots = []
    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
    
    # Generate slots for the next 14 days
    while current_date <= end_date_obj:
        # Available time slots (9 AM to 5 PM, every 30 minutes)
        for hour in range(9, 17):
            for minute in [0, 30]:
                start_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                end_time = start_time + timedelta(minutes=30)
                
                # Skip weekends for now
                if current_date.weekday() < 5:  # Monday = 0, Friday = 4
                    slots.append(MeetingSlotResponse(
                        id=str(uuid.uuid4()),
                        date=current_date.strftime("%Y-%m-%d"),
                        start_time=start_time.strftime("%H:%M"),
                        end_time=end_time.strftime("%H:%M"),
                        available=True
                    ))
        
        current_date += timedelta(days=1)
    
    return slots

@router.get("/types", response_model=List[MeetingTypeResponse])
async def get_meeting_types():
    """Get all available meeting types"""
    return [MeetingTypeResponse(**mt) for mt in MEETING_TYPES]

@router.get("/slots", response_model=List[MeetingSlotResponse])
async def get_available_slots(
    start_date: str = "2025-01-20",
    end_date: str = "2025-02-03",
    meeting_type_id: Optional[str] = None
):
    """Get available meeting slots for the given date range"""
    return generate_available_slots(start_date, end_date)

@router.post("/book", response_model=MeetingBookingResponse)
async def book_meeting(
    booking: MeetingBookingCreate
):
    """Book a new meeting"""
    # Find the meeting type
    meeting_type = next((mt for mt in MEETING_TYPES if mt["id"] == booking.meeting_type_id), None)
    if not meeting_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting type not found"
        )
    
    # Save the booking to the database
    try:
        interview_id = str(uuid.uuid4())
        
        # For now, use a default org_id - in production you'd get this from the authenticated user
        default_org_id = "550e8400-e29b-41d4-a716-446655440000"
        
        # Use an existing application ID from the database for now
        # In production, you'd create or find the right application
        existing_app_sql = """
            SELECT id FROM applications 
            WHERE org_id = %s 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        
        app_result = await fetchrow(existing_app_sql, default_org_id)
        application_id = app_result["id"] if app_result else "550e8400-e29b-41d4-a716-446655440401"  # fallback
        
        # Insert into interviews table
        insert_sql = """
            INSERT INTO interviews (
                id, org_id, application_id, scheduled_start, scheduled_end, 
                mode, location, notes
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        
        # Prepare notes with agenda and preparation notes
        notes = f"Meeting Type: {meeting_type['name']}\nLead: {booking.lead_id}\nAgenda: {booking.agenda}\nPreparation: {booking.preparation_notes}"
        
        print(f"🔄 Attempting to save meeting: {interview_id}")
        print(f"   - Application ID: {application_id}")
        print(f"   - Start: {booking.scheduled_start}")
        print(f"   - End: {booking.scheduled_end}")
        
        await execute(insert_sql, interview_id, default_org_id, application_id,
                     booking.scheduled_start, booking.scheduled_end, 
                     meeting_type["location"], booking.location, notes)
        
        print(f"✅ Meeting saved to database: {interview_id} for lead {booking.lead_id}")
        
    except Exception as e:
        import traceback
        print(f"❌ Error saving meeting to database: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        # Don't fail the request, just log the error
        interview_id = str(uuid.uuid4())
    
    # Create response
    booking_response = MeetingBookingResponse(
        id=interview_id,
        lead_id=booking.lead_id,
        meeting_type=MeetingTypeResponse(**meeting_type),
        scheduled_start=booking.scheduled_start,
        scheduled_end=booking.scheduled_end,
        location=booking.location,
        participants=booking.participants,
        agenda=booking.agenda,
        preparation_notes=booking.preparation_notes,
        reminder_settings=booking.reminder_settings,
        status=booking.status,
        created_at=datetime.now()
    )
    
    return booking_response

@router.get("/bookings", response_model=List[MeetingBookingResponse])
async def get_meetings(
    lead_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get meetings with optional filtering"""
    try:
        # Query the interviews table
        sql = """
            SELECT 
                i.id, i.scheduled_start, i.scheduled_end, i.mode, i.location, i.notes, i.created_at,
                a.person_id as lead_id
            FROM interviews i
            LEFT JOIN applications a ON i.application_id = a.id
            ORDER BY i.scheduled_start DESC
            LIMIT 10
        """
        
        interviews = await fetch(sql)
        
        print(f"🔍 Found {len(interviews)} interviews in database")
        for i, interview in enumerate(interviews):
            print(f"   {i+1}. ID: {interview.get('id')}, Lead: {interview.get('lead_id')}")
        
        # Convert to response format
        bookings = []
        for interview in interviews:
            try:
                # Parse notes to extract meeting info
                notes = interview.get("notes", "")
                agenda = ""
                preparation_notes = ""
                meeting_type_name = "Application Interview"
                
                if "Agenda:" in notes:
                    agenda_start = notes.find("Agenda:") + 7
                    agenda_end = notes.find("\nPreparation:")
                    if agenda_end > 0:
                        agenda = notes[agenda_start:agenda_end].strip()
                    else:
                        agenda = notes[agenda_start:].strip()
                
                if "Preparation:" in notes:
                    prep_start = notes.find("Preparation:") + 12
                    preparation_notes = notes[prep_start:].strip()
                
                if "Meeting Type:" in notes:
                    type_start = notes.find("Meeting Type:") + 13
                    type_end = notes.find("\n", type_start)
                    if type_end > 0:
                        meeting_type_name = notes[type_start:type_end].strip()
                
                # Find matching meeting type
                meeting_type = next((mt for mt in MEETING_TYPES if mt["name"] == meeting_type_name), MEETING_TYPES[0])
                
                # Skip interviews without lead_id
                if not interview.get("lead_id"):
                    print(f"⚠️  Skipping interview {interview['id']} - no lead_id")
                    continue
                    
                booking = MeetingBookingResponse(
                    id=interview["id"],
                    lead_id=str(interview["lead_id"]),
                    meeting_type=MeetingTypeResponse(**meeting_type),
                    scheduled_start=interview["scheduled_start"],
                    scheduled_end=interview["scheduled_end"],
                    location=interview["location"] or "virtual",
                    participants=[],
                    agenda=agenda,
                    preparation_notes=preparation_notes,
                    reminder_settings={"email": True, "sms": False, "calendar": True, "reminder_time": 30},
                    status="scheduled",
                    created_at=interview["created_at"]
                )
                bookings.append(booking)
                print(f"✅ Added booking for lead {interview['lead_id']}")
            except Exception as e:
                print(f"❌ Error processing interview {interview.get('id')}: {e}")
                continue
        
        return bookings
        
    except Exception as e:
        print(f"❌ Error fetching meetings: {e}")
        return []

@router.put("/bookings/{booking_id}", response_model=MeetingBookingResponse)
async def update_meeting(
    booking_id: str,
    booking_update: dict
):
    """Update an existing meeting"""
    # Mock implementation for now
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Meeting updates not yet implemented"
    )

@router.delete("/bookings/{booking_id}")
async def cancel_meeting(
    booking_id: str
):
    """Cancel a meeting"""
    # Mock implementation for now
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Meeting cancellation not yet implemented"
    )

@router.get("/debug/interviews")
async def debug_interviews():
    """Debug endpoint to check interviews table"""
    try:
        sql = "SELECT COUNT(*) as count FROM interviews"
        result = await fetchrow(sql)
        
        sql2 = "SELECT * FROM interviews ORDER BY created_at DESC LIMIT 3"
        interviews = await fetch(sql2)
        
        return {
            "total_interviews": result["count"] if result else 0,
            "recent_interviews": interviews
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/debug/test-insert")
async def test_insert():
    """Test a simple database insert"""
    try:
        test_id = str(uuid.uuid4())
        default_org_id = "550e8400-e29b-41d4-a716-446655440000"
        default_app_id = "550e8400-e29b-41d4-a716-446655440401"
        
        sql = """
            INSERT INTO interviews (
                id, org_id, application_id, scheduled_start, scheduled_end, 
                mode, location, notes
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        
        from datetime import datetime, timezone
        start_time = datetime(2025, 1, 25, 10, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2025, 1, 25, 10, 30, 0, tzinfo=timezone.utc)
        
        await execute(sql, test_id, default_org_id, default_app_id,
                     start_time, end_time, "virtual", "test location", "Test meeting notes")
        
        return {"success": True, "test_id": test_id, "message": "Test insert successful"}
        
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}

@router.get("/debug/test-query")
async def test_query():
    """Test the bookings query"""
    try:
        sql = """
            SELECT 
                i.id, i.scheduled_start, i.scheduled_end, i.mode, i.location, i.notes, i.created_at,
                a.person_id as lead_id
            FROM interviews i
            LEFT JOIN applications a ON i.application_id = a.id
            ORDER BY i.scheduled_start DESC
            LIMIT 3
        """
        
        interviews = await fetch(sql)
        
        return {
            "success": True,
            "count": len(interviews),
            "interviews": interviews
        }
        
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}
