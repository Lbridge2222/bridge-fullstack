"""
CRM router for handling CRM-specific endpoints like field options and saved views.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
from app.db.db import fetch, execute, execute_returning

router = APIRouter()

# Field options for leads management
LEAD_FIELD_OPTIONS = [
    {"key": "name", "label": "Name", "description": "Full name of the lead"},
    {"key": "email", "label": "Email", "description": "Email address"},
    {"key": "phone", "label": "Phone", "description": "Phone number"},
    {"key": "company", "label": "Company", "description": "Company name"},
    {"key": "title", "label": "Job Title", "description": "Job title or position"},
    {"key": "source", "label": "Source", "description": "Lead source"},
    {"key": "status", "label": "Status", "description": "Lead status"},
    {"key": "score", "label": "Score", "description": "Lead score"},
    {"key": "created_at", "label": "Created", "description": "Date created"},
    {"key": "updated_at", "label": "Updated", "description": "Last updated"},
    {"key": "lifecycle_stage", "label": "Lifecycle Stage", "description": "Current lifecycle stage"},
    {"key": "conversion_probability", "label": "Conversion Probability", "description": "AI-predicted conversion probability"},
    {"key": "notes", "label": "Notes", "description": "Lead notes and comments"},
]

class SavedFolder(BaseModel):
    id: str
    name: str
    type: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SavedView(BaseModel):
    id: str
    name: str
    folder_id: str
    filters: Dict[str, Any]
    columns: List[str]
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "asc"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SavedFolderWithViews(SavedFolder):
    views: Optional[List[SavedView]] = []

@router.get("/leads/field-options")
async def get_lead_field_options():
    """Get available field options for leads management."""
    return LEAD_FIELD_OPTIONS

@router.get("/saved-views/folders")
async def get_saved_view_folders(withViews: bool = False):
    """Get saved view folders, optionally with nested views."""
    # Return default folders for now
    folders = [
        {
            "id": "default",
            "name": "Default Views",
            "type": "leads",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "custom",
            "name": "Custom Views", 
            "type": "leads",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    ]
    
    if withViews:
        # Add some default views
        folders[0]["views"] = [
            {
                "id": "all-leads",
                "name": "All Leads",
                "folder_id": "default",
                "filters": {},
                "columns": ["name", "email", "status", "score"],
                "sort_by": "created_at",
                "sort_order": "desc",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "high-score-leads",
                "name": "High Score Leads",
                "folder_id": "default", 
                "filters": {"score": {"gte": 80}},
                "columns": ["name", "email", "score", "conversion_probability"],
                "sort_by": "score",
                "sort_order": "desc",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ]
        folders[1]["views"] = []
    
    return folders

@router.post("/saved-views/folders")
async def create_saved_view_folder(folder_data: Dict[str, Any]):
    """Create a new saved view folder."""
    # For now, just return a mock response
    return {
        "id": f"folder_{len(folder_data)}",
        "name": folder_data.get("name", "New Folder"),
        "type": folder_data.get("type", "leads"),
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }

@router.post("/saved-views")
async def create_saved_view(view_data: Dict[str, Any]):
    """Create a new saved view."""
    # For now, just return a mock response
    return {
        "id": f"view_{len(view_data)}",
        "name": view_data.get("name", "New View"),
        "folder_id": view_data.get("folder_id", "default"),
        "filters": view_data.get("filters", {}),
        "columns": view_data.get("columns", []),
        "sort_by": view_data.get("sort_by"),
        "sort_order": view_data.get("sort_order", "asc"),
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }

class EmailLogRequest(BaseModel):
    lead_id: str
    subject: str
    body: str
    html_body: Optional[str] = None
    sent_by: Optional[str] = None
    intent: Optional[str] = None

@router.post("/emails/log")
async def log_sent_email(email_data: EmailLogRequest):
    """Log a sent email to the database."""
    try:
        # First check if the table exists
        try:
            table_check = await fetch("SELECT COUNT(*) as count FROM email_logs")
            print(f"Email logs table check: {table_check}")
        except Exception as e:
            print(f"Table check failed: {e}")
            raise HTTPException(status_code=500, detail=f"Email logs table not found: {str(e)}")
        
        # Insert email log into database
        sql = """
        INSERT INTO email_logs (
            lead_id, 
            subject, 
            body, 
            html_body, 
            sent_by, 
            intent, 
            sent_at, 
            status
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s
        )
        RETURNING id, sent_at
        """
        
        now = datetime.utcnow()
        print(f"About to insert email log with data: {email_data}")
        
        try:
            result = await execute_returning(sql, 
                email_data.lead_id,
                email_data.subject,
                email_data.body,
                email_data.html_body,
                email_data.sent_by or "system",
                email_data.intent or "manual",
                now,
                "sent"
            )
            print(f"Insert result: {result}")
        except Exception as e:
            print(f"Insert failed: {e}")
            raise HTTPException(status_code=500, detail=f"Insert failed: {str(e)}")
        
        if result and len(result) > 0:
            email_log_id = result[0]["id"]
            sent_at = result[0]["sent_at"]
            
            # Also add an activity entry to the lead's timeline
            try:
                activity_sql = """
                INSERT INTO lead_activities (
                    lead_id,
                    activity_type,
                    activity_title,
                    activity_description,
                    created_at,
                    metadata
                ) VALUES (
                    %s, %s, %s, %s, %s, %s
                )
                """
                
                await execute(activity_sql, 
                    email_data.lead_id,
                    "email_sent",
                    f"Email sent: {email_data.subject}",
                    f"Email sent to lead with subject: {email_data.subject}",
                    now,
                    {"email_log_id": email_log_id, "intent": email_data.intent}
                )
                print(f"Activity logged successfully")
            except Exception as e:
                print(f"Activity logging failed: {e}")
                # Don't fail the whole operation if activity logging fails
            
            return {
                "success": True,
                "email_log_id": email_log_id,
                "sent_at": sent_at.isoformat(),
                "message": "Email logged successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Insert completed but no result returned")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Email logging error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to log email: {str(e)}")


@router.get("/emails/history/{lead_id}")
async def get_email_history(lead_id: str, limit: int = 10):
    """Get email history for a specific lead"""
    try:
        # Get recent emails for this lead
        email_history_sql = """
            SELECT 
                id,
                subject,
                sent_at,
                sent_by,
                intent,
                status,
                created_at
            FROM email_logs 
            WHERE lead_id = %s 
            ORDER BY sent_at DESC 
            LIMIT %s
        """
        
        email_history = await fetch(email_history_sql, lead_id, limit)
        
        # Get recent activities for this lead
        activities_sql = """
            SELECT 
                id,
                activity_type,
                activity_title,
                activity_description,
                created_at,
                metadata
            FROM lead_activities 
            WHERE lead_id = %s 
            ORDER BY created_at DESC 
            LIMIT %s
        """
        
        activities = await fetch(activities_sql, lead_id, limit)
        
        return {
            "lead_id": lead_id,
            "email_history": email_history,
            "activities": activities,
            "total_emails": len(email_history),
            "total_activities": len(activities)
        }
        
    except Exception as e:
        print(f"Email history error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch email history: {str(e)}")
