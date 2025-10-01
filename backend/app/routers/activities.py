from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import logging
from app.db.db import fetch, execute
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

class ActivityCreate(BaseModel):
    person_id: str
    activity_type: str
    activity_title: str
    activity_description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ActivityOut(BaseModel):
    id: Union[int, str]
    lead_id: str
    activity_type: str
    activity_title: str
    activity_description: Optional[str] = None
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

@router.post("/", response_model=ActivityOut)
async def create_activity(activity: ActivityCreate):
    """
    Create a new activity for a person/lead
    """
    try:
        # Insert into lead_activities table
        sql = """
        INSERT INTO lead_activities (lead_id, activity_type, activity_title, activity_description, metadata)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, lead_id, activity_type, activity_title, activity_description, created_at, metadata
        """
        
        result = await execute(
            sql,
            activity.person_id,
            activity.activity_type,
            activity.activity_title,
            activity.activity_description,
            activity.metadata
        )
        
        if not result or len(result) == 0:
            raise HTTPException(status_code=500, detail="Failed to create activity")
        
        return ActivityOut(**result[0])
        
    except Exception as e:
        logger.error(f"Error creating activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create activity: {str(e)}")

@router.get("/person/{person_id}", response_model=List[ActivityOut])
async def get_person_activities(
    person_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Get activities for a specific person/lead from existing tables (calls, email_logs, interviews)
    """
    try:
        activities = []
        
        # Get calls for this person
        calls_sql = """
        SELECT 
            id::text as id,
            lead_id::text as lead_id,
            'call' as activity_type,
            CASE 
                WHEN call_outcome IS NOT NULL THEN 'Call completed'
                ELSE 'Call started'
            END as activity_title,
            COALESCE(notes, '') as activity_description,
            created_at,
            jsonb_build_object(
                'call_type', call_type,
                'duration', duration,
                'call_outcome', call_outcome,
                'action_items', action_items,
                'follow_up_date', follow_up_date,
                'priority', priority
            ) as metadata
        FROM calls 
        WHERE lead_id = %s
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
        """
        
        calls = await fetch(calls_sql, person_id, limit, offset)
        activities.extend([ActivityOut(**row) for row in calls])
        
        # Get emails for this person
        emails_sql = """
        SELECT 
            id::text as id,
            lead_id::text as lead_id,
            'email' as activity_type,
            'Email sent: ' || subject as activity_title,
            body as activity_description,
            sent_at as created_at,
            jsonb_build_object(
                'subject', subject,
                'sent_by', sent_by,
                'intent', intent,
                'status', status
            ) as metadata
        FROM email_logs 
        WHERE lead_id = %s
        ORDER BY sent_at DESC
        LIMIT %s OFFSET %s
        """
        
        emails = await fetch(emails_sql, person_id, limit, offset)
        activities.extend([ActivityOut(**row) for row in emails])
        
        # Get interviews for this person (need to join with applications to get person_id)
        interviews_sql = """
        SELECT 
            i.id::text as id,
            a.person_id::text as lead_id,
            'meeting' as activity_type,
            'Interview scheduled' as activity_title,
            COALESCE(i.notes, '') as activity_description,
            i.created_at,
            jsonb_build_object(
                'scheduled_start', i.scheduled_start,
                'scheduled_end', i.scheduled_end,
                'mode', i.mode,
                'location', i.location,
                'outcome', i.outcome
            ) as metadata
        FROM interviews i
        JOIN applications a ON i.application_id = a.id
        WHERE a.person_id = %s
        ORDER BY i.created_at DESC
        LIMIT %s OFFSET %s
        """
        
        interviews = await fetch(interviews_sql, person_id, limit, offset)
        activities.extend([ActivityOut(**row) for row in interviews])
        
        # Sort all activities by created_at descending
        activities.sort(key=lambda x: x.created_at, reverse=True)
        
        # Apply limit and offset to the combined results
        return activities[offset:offset + limit]
        
    except Exception as e:
        logger.error(f"Error fetching activities for person {person_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch activities: {str(e)}")

@router.get("/{activity_id}", response_model=ActivityOut)
async def get_activity(activity_id: int):
    """
    Get a specific activity by ID
    """
    try:
        sql = """
        SELECT id, lead_id, activity_type, activity_title, activity_description, created_at, metadata
        FROM lead_activities
        WHERE id = %s
        """
        
        result = await fetch(sql, activity_id)
        if not result or len(result) == 0:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        return ActivityOut(**result[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching activity {activity_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch activity: {str(e)}")

@router.delete("/{activity_id}")
async def delete_activity(activity_id: int):
    """
    Delete a specific activity by ID
    """
    try:
        sql = "DELETE FROM lead_activities WHERE id = %s"
        result = await execute(sql, activity_id)
        
        if result == 0:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        return {"message": "Activity deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting activity {activity_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete activity: {str(e)}")
