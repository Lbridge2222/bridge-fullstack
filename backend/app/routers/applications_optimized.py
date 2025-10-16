"""
Optimized Applications Router - Performance improvements for application page loading
"""

from fastapi import APIRouter, Query, HTTPException, Path, Body
from typing import List, Optional, Dict, Any
from uuid import UUID
import time
import logging

from app.db.db import fetch, execute, fetchrow
from app.schemas.applications import ApplicationCard, StageMoveIn, StageMoveOut
from app.cache import cached

logger = logging.getLogger(__name__)

router = APIRouter()

# Unified stage constants - Comprehensive 18-stage admissions pipeline
ALLOWED_STAGES = {
    "enquiry": "Enquiry",
    "pre_application": "Pre Application",
    "application_submitted": "Application Submitted",
    "fee_status_query": "Fee Status Query",
    "interview_portfolio": "Interview/Portfolio",
    "review_in_progress": "Review in Progress",
    "review_complete": "Review Complete",
    "director_review_in_progress": "Director Review In Progress",
    "director_review_complete": "Director Review Complete",
    "conditional_offer_no_response": "Conditional Offer (No Response)",
    "unconditional_offer_no_response": "Unconditional Offer (No Response)",
    "conditional_offer_accepted": "Conditional Offer (Accepted)",
    "unconditional_offer_accepted": "Unconditional Offer (Accepted)",
    "ready_to_enrol": "Ready to Enrol",
    "enrolled": "Enrolled",
    "rejected": "Rejected",
    "offer_withdrawn": "Offer Withdrawn",
    "offer_declined": "Offer Declined"
}

@router.get("/board-optimized", response_model=List[ApplicationCard])
@cached(ttl=300)  # Cache for 5 minutes
async def board_optimized(
    stage: Optional[str] = Query(None),
    assignee: Optional[UUID] = Query(None),
    priority: Optional[str] = Query(None, description="critical|high|medium|low"),
    urgency: Optional[str] = Query(None, description="high|medium|low"),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Optimized application board with better performance.
    Uses materialized view and optimized queries.
    """
    start_time = time.time()
    
    # Optimized query with better performance
    sql = """
    WITH application_data AS (
        SELECT 
            application_id,
            stage,
            status,
            source,
            sub_source,
            assignee_user_id,
            created_at,
            priority,
            urgency,
            urgency_reason,
            person_id,
            first_name,
            last_name,
            email,
            phone,
            lead_score,
            conversion_probability,
            programme_name,
            programme_code,
            campus_name,
            cycle_label,
            COALESCE((days_in_pipeline)::int, 0) as days_in_pipeline,
            sla_overdue,
            has_offer,
            has_active_interview,
            last_activity_at,
            offer_type,
            progression_probability,
            enrollment_probability,
            next_stage_eta_days,
            enrollment_eta_days,
            progression_blockers,
            recommended_actions
        FROM vw_board_applications
        WHERE (%s::text IS NULL OR stage = %s::text)
          AND (%s::uuid IS NULL OR assignee_user_id = %s::uuid)
          AND (%s::text IS NULL OR priority = %s::text)
          AND (%s::text IS NULL OR urgency = %s::text)
    )
    SELECT * FROM application_data
    ORDER BY created_at DESC
    LIMIT %s::int
    """
    
    try:
        result = await fetch(sql, stage, stage, assignee, assignee, priority, priority, urgency, urgency, limit)
        
        query_time = (time.time() - start_time) * 1000
        logger.info(f"Optimized application board query completed in {query_time:.2f}ms")
        
        return result
    except Exception as e:
        logger.error(f"Database error in optimized application board query: {e}")
        raise HTTPException(status_code=500, detail=f"/applications/board-optimized DB error: {e}")

@router.get("/board-fast", response_model=List[ApplicationCard])
@cached(ttl=600)  # Cache for 10 minutes
async def board_fast(
    stage: Optional[str] = Query(None),
    assignee: Optional[UUID] = Query(None),
    priority: Optional[str] = Query(None, description="critical|high|medium|low"),
    urgency: Optional[str] = Query(None, description="high|medium|low"),
    limit: int = Query(50, ge=1, le=200)  # Smaller default limit
):
    """
    Fast application board with minimal data for quick loading.
    """
    start_time = time.time()
    
    # Minimal query for fast loading
    sql = """
    SELECT 
        application_id,
        stage,
        status,
        assignee_user_id,
        created_at,
        priority,
        urgency,
        person_id,
        first_name,
        last_name,
        email,
        programme_name,
        campus_name,
        COALESCE((days_in_pipeline)::int, 0) as days_in_pipeline,
        sla_overdue,
        has_offer
    FROM vw_board_applications
    WHERE (%s::text IS NULL OR stage = %s::text)
      AND (%s::uuid IS NULL OR assignee_user_id = %s::uuid)
      AND (%s::text IS NULL OR priority = %s::text)
      AND (%s::text IS NULL OR urgency = %s::text)
    ORDER BY created_at DESC
    LIMIT %s::int
    """
    
    try:
        result = await fetch(sql, stage, stage, assignee, assignee, priority, priority, urgency, urgency, limit)
        
        query_time = (time.time() - start_time) * 1000
        logger.info(f"Fast application board query completed in {query_time:.2f}ms")
        
        return result
    except Exception as e:
        logger.error(f"Database error in fast application board query: {e}")
        raise HTTPException(status_code=500, detail=f"/applications/board-fast DB error: {e}")

@router.get("/stages-optimized")
@cached(ttl=3600)  # Cache for 1 hour (stages don't change often)
async def list_stages_optimized():
    """Optimized stages endpoint with caching"""
    return [{"id": stage_id, "label": stage_label} for stage_id, stage_label in ALLOWED_STAGES.items()]

@router.get("/board-stats")
@cached(ttl=300)  # Cache for 5 minutes
async def get_board_stats():
    """
    Get application board statistics for dashboard.
    """
    start_time = time.time()
    
    sql = """
    SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN stage = 'application_submitted' THEN 1 END) as submitted,
        COUNT(CASE WHEN stage = 'review_in_progress' THEN 1 END) as in_review,
        COUNT(CASE WHEN stage = 'conditional_offer_no_response' THEN 1 END) as conditional_offers,
        COUNT(CASE WHEN stage = 'unconditional_offer_no_response' THEN 1 END) as unconditional_offers,
        COUNT(CASE WHEN stage = 'enrolled' THEN 1 END) as enrolled,
        COUNT(CASE WHEN stage = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN sla_overdue = true THEN 1 END) as overdue,
        COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN urgency = 'high' THEN 1 END) as high_urgency
    FROM vw_board_applications
    """
    
    try:
        result = await fetch(sql)
        stats = result[0] if result else {}
        
        query_time = (time.time() - start_time) * 1000
        logger.info(f"Board stats query completed in {query_time:.2f}ms")
        
        return stats
    except Exception as e:
        logger.error(f"Database error in board stats query: {e}")
        raise HTTPException(status_code=500, detail=f"/applications/board-stats DB error: {e}")

@router.get("/performance-stats")
async def get_performance_stats():
    """
    Get performance statistics for the applications endpoints.
    """
    try:
        # Get cache statistics
        from app.cache import cache
        cache_stats = {
            "cache_size": cache.size(),
            "cache_entries": len(cache.cache)
        }
        
        # Test query performance
        start_time = time.time()
        await fetch("SELECT COUNT(*) FROM vw_board_applications")
        count_time = (time.time() - start_time) * 1000
        
        return {
            "cache_stats": cache_stats,
            "database_performance": {
                "board_view_count_ms": count_time
            },
            "optimization_status": "Active"
        }
    except Exception as e:
        logger.error(f"Error getting performance stats: {e}")
        return {"error": str(e)}

# Keep the original endpoints for backward compatibility
@router.get("/board", response_model=List[ApplicationCard])
@router.get("/board/", response_model=List[ApplicationCard])
async def board(
    stage: Optional[str] = Query(None),
    assignee: Optional[UUID] = Query(None),
    priority: Optional[str] = Query(None, description="critical|high|medium|low"),
    urgency: Optional[str] = Query(None, description="high|medium|low"),
    limit: int = Query(100, ge=1, le=500)
):
    """Original board endpoint - delegates to optimized version"""
    return await board_optimized(stage, assignee, priority, urgency, limit)

@router.get("/stages")
async def list_stages():
    """Original stages endpoint - delegates to optimized version"""
    return await list_stages_optimized()
