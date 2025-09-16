"""
CRM router for handling CRM-specific endpoints like field options and saved views.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

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
