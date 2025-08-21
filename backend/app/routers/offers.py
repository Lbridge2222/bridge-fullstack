from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.db.db import fetch

router = APIRouter()

@router.get("")
async def list_offers(
    status: Optional[str] = Query(None, description="Filter by offer status"),
    limit: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search by student name or email")
) -> List[Dict[str, Any]]:
    """
    Get offers management data with comprehensive offer and enrollment information.
    """
    try:
        # Build the query with optional filters
        sql = """
            SELECT * FROM vw_offers_management
            WHERE (%s::text IS NULL OR offer_status = %s)
            AND (%s::text IS NULL OR (
                (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) ILIKE %s
                OR email ILIKE %s
            ))
            ORDER BY created_at DESC
            LIMIT %s::int
        """
        
        pattern = f"%{q}%" if q else None
        
        result = await fetch(sql, status, status, q, pattern, pattern, limit)
        
        # Transform the data to match the frontend expectations
        offers = []
        for row in result:
            offer = {
                "id": row["offer_id"],
                "studentName": f"{row['first_name'] or ''} {row['last_name'] or ''}".strip(),
                "studentId": str(row["person_id"])[:8],  # Short ID for display
                "email": row["email"],
                "phone": row["phone"],
                "course": row["programme_name"],
                "campus": row["campus_name"],
                "intake": row["academic_year"],
                "offerType": row["offer_type"],
                "offerStatus": row["offer_status"],
                "offerDate": row["offer_date"].isoformat() if row["offer_date"] else None,
                "acceptanceDate": row["acceptance_date"].isoformat() if row["acceptance_date"] else None,
                "enrollmentTarget": row["enrollment_deadline"].isoformat() if row["enrollment_deadline"] else None,
                "adminStatus": row["admin_status"],
                "checklist": {
                    "academic": {
                        "status": "verified" if row["academic_docs_verified"] else "pending",
                        "dueDate": None,
                        "description": "Academic documents verification",
                        "category": "academic",
                        "submittedDate": None,
                        "notes": None
                    },
                    "identity": {
                        "status": "verified" if row["identity_docs_verified"] else "pending",
                        "dueDate": None,
                        "description": "Identity documents verification",
                        "category": "identity",
                        "submittedDate": None,
                        "notes": None
                    },
                    "financial": {
                        "status": "verified" if row["financial_docs_verified"] else "pending",
                        "dueDate": None,
                        "description": "Financial documents verification",
                        "category": "financial",
                        "submittedDate": None,
                        "notes": None
                    },
                    "accommodation": {
                        "status": "verified" if row["accommodation_docs_verified"] else "pending",
                        "dueDate": None,
                        "description": "Accommodation documents verification",
                        "category": "accommodation",
                        "submittedDate": None,
                        "notes": None
                    },
                    "health": {
                        "status": "verified" if row["health_docs_verified"] else "pending",
                        "dueDate": None,
                        "description": "Health documents verification",
                        "category": "health",
                        "submittedDate": None,
                        "notes": None
                    }
                },
                "lastContact": row["updated_at"].isoformat() if row["updated_at"] else None,
                "urgentItems": [row["urgent_items"]] if row["urgent_items"] else []
            }
            offers.append(offer)
        
        return offers
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch offers: {str(e)}")

@router.get("/{offer_id}")
async def get_offer(offer_id: str) -> Dict[str, Any]:
    """
    Get detailed information for a specific offer.
    """
    try:
        result = await fetch(
            "SELECT * FROM vw_offers_management WHERE offer_id = %s LIMIT 1",
            offer_id
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        row = result[0]
        
        # Return the same structure as list_offers but for a single offer
        return {
            "id": row["offer_id"],
            "studentName": f"{row['first_name'] or ''} {row['last_name'] or ''}".strip(),
            "studentId": str(row["person_id"])[:8],
            "email": row["email"],
            "phone": row["phone"],
            "course": row["programme_name"],
            "campus": row["campus_name"],
            "intake": row["academic_year"],
            "offerType": row["offer_type"],
            "offerStatus": row["offer_status"],
            "offerDate": row["offer_date"].isoformat() if row["offer_date"] else None,
            "acceptanceDate": row["acceptance_date"].isoformat() if row["acceptance_date"] else None,
            "enrollmentTarget": row["enrollment_deadline"].isoformat() if row["enrollment_deadline"] else None,
            "adminStatus": row["admin_status"],
            "checklist": {
                "academic": {
                    "status": "verified" if row["academic_docs_verified"] else "pending",
                    "dueDate": None,
                    "description": "Academic documents verification",
                    "category": "academic",
                    "submittedDate": None,
                    "notes": None
                },
                "identity": {
                    "status": "verified" if row["identity_docs_verified"] else "pending",
                    "dueDate": None,
                    "description": "Identity documents verification",
                    "category": "identity",
                    "submittedDate": None,
                    "notes": None
                },
                "financial": {
                    "status": "verified" if row["financial_docs_verified"] else "pending",
                    "dueDate": None,
                    "description": "Financial documents verification",
                    "category": "financial",
                    "submittedDate": None,
                    "notes": None
                },
                "accommodation": {
                    "status": "verified" if row["accommodation_docs_verified"] else "pending",
                    "dueDate": None,
                    "description": "Accommodation documents verification",
                    "category": "accommodation",
                    "submittedDate": None,
                    "notes": None
                },
                "health": {
                    "status": "verified" if row["health_docs_verified"] else "pending",
                    "dueDate": None,
                    "description": "Health documents verification",
                    "category": "health",
                    "submittedDate": None,
                    "notes": None
                }
            },
            "lastContact": row["updated_at"].isoformat() if row["updated_at"] else None,
            "urgentItems": [row["urgent_items"]] if row["urgent_items"] else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch offer: {str(e)}")
