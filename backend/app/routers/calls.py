"""
Call Management API endpoints for tracking phone calls and outcomes.
Uses the dedicated 'calls' table for proper call tracking.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import uuid
import json

from app.db.database import fetch, execute
from app.core.settings import get_settings

router = APIRouter(prefix="/calls", tags=["calls"])
settings = get_settings()

# Pydantic models matching the calls table schema
class CallStart(BaseModel):
    lead_id: str  # person_id from people table
    call_type: str = "outbound"  # outbound, inbound

class CallEnd(BaseModel):
    call_id: str
    duration_seconds: int
    call_outcome: str  # interested, not_interested, callback_requested, no_answer, busy, etc.
    notes: Optional[str] = None
    action_items: Optional[List[str]] = None
    follow_up_date: Optional[date] = None
    follow_up_type: str = "none"
    priority: str = "medium"
    recording_url: Optional[str] = None
    transcription: Optional[str] = None
    ai_analysis: Optional[dict] = None
    tags: Optional[List[str]] = None

class CallNote(BaseModel):
    content: str
    type: str = "general"
    tags: List[str] = []

class CallOutcome(BaseModel):
    call_outcome: str
    notes: Optional[str] = None
    action_items: Optional[List[str]] = None
    follow_up_date: Optional[date] = None
    follow_up_type: str = "none"
    priority: str = "medium"

@router.post("/start")
async def start_call(call_data: CallStart):
    """
    Start a new call and return the call ID for tracking.
    Creates a record in the dedicated 'calls' table.
    """
    try:
        # Generate a new call ID
        call_id = str(uuid.uuid4())
        
        # Create the call record in the calls table
        await execute("""
            INSERT INTO calls (id, lead_id, call_type, call_outcome, duration, follow_up_type, priority, created_at)
            VALUES (%s, %s, %s, 'in_progress', 0, 'none', 'medium', NOW())
        """, call_id, call_data.lead_id, call_data.call_type)
        
        return {
            "call_id": call_id,
            "message": "Call started successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start call: {e}")

@router.post("/end")
async def end_call(call_data: CallEnd):
    """
    End a call and record the outcome, duration, and any notes.
    Updates the record in the dedicated 'calls' table.
    """
    try:
        # Update the call record with final details
        await execute("""
            UPDATE calls 
            SET call_outcome = %s,
                duration = %s,
                notes = %s,
                action_items = %s,
                follow_up_date = %s,
                follow_up_type = %s,
                priority = %s,
                recording_url = %s,
                transcription = %s,
                ai_analysis = %s,
                tags = %s,
                updated_at = NOW()
            WHERE id = %s
        """, 
        call_data.call_outcome,
        call_data.duration_seconds,
        call_data.notes,
        call_data.action_items or [],
        call_data.follow_up_date,
        call_data.follow_up_type,
        call_data.priority,
        call_data.recording_url,
        call_data.transcription,
        json.dumps(call_data.ai_analysis) if call_data.ai_analysis else None,
        call_data.tags or [],
        call_data.call_id)
        
        # Also add individual notes to lead_notes table if provided
        if call_data.notes:
            print(f"DEBUG: Adding note to lead_notes for call {call_data.call_id}")
            await execute("""
                INSERT INTO lead_notes (person_id, note, note_type, created_by, created_at)
                SELECT lead_id, %s, 'call_note', 'system', NOW()
                FROM calls WHERE id = %s
            """, call_data.notes, call_data.call_id)
        
        return {
            "message": "Call ended successfully",
            "call_id": call_data.call_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end call: {e}")

@router.post("/update-transcription")
async def update_call_transcription(call_id: str, transcription_data: dict):
    """
    Update the transcription for an ongoing call.
    """
    try:
        transcription_text = transcription_data.get("transcription", "")
        
        await execute("""
            UPDATE calls 
            SET transcription = %s, updated_at = NOW() 
            WHERE id = %s
        """, transcription_text, call_id)
        
        return {"message": "Transcription updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update transcription: {e}")

@router.post("/add-note")
async def add_call_note(request: dict):
    """
    Add a note to an ongoing call.
    Updates the calls table and adds to lead_notes.
    """
    try:
        call_id = request.get("call_id")
        note_data = request.get("note", {})
        
        if not call_id:
            raise HTTPException(status_code=400, detail="call_id is required")
        
        # Get lead_id from call
        call_data = await fetch("SELECT lead_id FROM calls WHERE id = %s", call_id)
        if not call_data:
            raise HTTPException(status_code=404, detail="Call not found")
        
        lead_id = call_data[0]["lead_id"]
        
        # Add the note to lead_notes table
        print(f"DEBUG: Adding note for call {call_id}, lead {lead_id}: {note_data.get('content')}")
        await execute("""
            INSERT INTO lead_notes (person_id, note, note_type, created_by, created_at)
            VALUES (%s, %s, %s, 'system', NOW())
        """, lead_id, note_data.get("content"), note_data.get("type", "general"))
        
        # Update the call's notes field (append to existing notes)
        existing_notes = await fetch("SELECT notes FROM calls WHERE id = %s", call_id)
        current_notes = existing_notes[0]["notes"] if existing_notes and existing_notes[0]["notes"] else ""
        
        updated_notes = f"{current_notes}\n{note_data.get('content')}".strip() if current_notes else note_data.get("content")
        
        await execute("""
            UPDATE calls SET notes = %s, updated_at = NOW() WHERE id = %s
        """, updated_notes, call_id)
        
        return {
            "message": "Note added successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add note: {e}")

@router.get("/call/{call_id}")
async def get_call(call_id: str):
    """
    Get details of a specific call.
    """
    try:
        call = await fetch("""
            SELECT c.*, p.first_name, p.last_name, p.email, p.phone
            FROM calls c
            JOIN people p ON c.lead_id = p.id
            WHERE c.id = %s
        """, call_id)
        
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {"call": call[0]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get call: {e}")

@router.get("/lead/{lead_id}/history")
async def get_call_history(lead_id: str):
    """
    Get call history for a specific lead.
    """
    try:
        calls = await fetch("""
            SELECT id, call_type, call_outcome, duration, notes, action_items, 
                   follow_up_date, follow_up_type, priority, created_at, updated_at
            FROM calls 
            WHERE lead_id = %s
            ORDER BY created_at DESC
        """, lead_id)
        
        return {"calls": calls}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get call history: {e}")

@router.get("/recent")
async def get_recent_calls(limit: int = 10):
    """
    Get recent calls across all leads.
    """
    try:
        calls = await fetch("""
            SELECT c.*, p.first_name, p.last_name, p.email
            FROM calls c
            JOIN people p ON c.lead_id = p.id
            ORDER BY c.created_at DESC
            LIMIT %s
        """, limit)
        
        return {"calls": calls}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recent calls: {e}")