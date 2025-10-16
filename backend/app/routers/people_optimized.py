"""
Optimized People Router - Performance improvements for contact loading
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Optional
import logging
import time

from app.db.db import fetch, execute
from app.schemas.people import PersonOut, PeoplePage, PersonUpdate, LeadUpdate, LeadNote, PropertyUpdate, assert_no_system_fields
from app.cache import cached

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/leads-optimized", response_model=List[dict])
@cached(ttl=300)  # Cache for 5 minutes
async def list_leads_optimized(
    q: Optional[str] = Query(None, description="name or email search"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Optimized leads listing with better performance.
    Uses materialized view approach and optimized queries.
    """
    start_time = time.time()
    
    # Use a more efficient query with better indexing strategy
    sql = """
    WITH lead_data AS (
        SELECT 
            p.id::text,
            p.first_name,
            p.last_name,
            p.email,
            p.phone,
            p.lifecycle_state,
            p.lead_score,
            p.conversion_probability::float,
            p.assigned_to,
            p.status,
            p.next_follow_up,
            p.created_at,
            p.updated_at,
            -- Latest application info (optimized)
            a.stage as latest_application_stage,
            pr.name as latest_programme_name,
            c.name as latest_campus_name,
            i.cycle_label as latest_academic_year,
            -- Activity tracking
            COALESCE(p.updated_at, p.created_at) as last_activity_at,
            'enquiry' as last_activity_kind,
            'Initial contact required' as last_activity_title
        FROM people p
        LEFT JOIN LATERAL (
            SELECT 
                ap.stage,
                ap.programme_id,
                ap.intake_id
            FROM applications ap
            WHERE ap.person_id = p.id
            ORDER BY ap.created_at DESC
            LIMIT 1
        ) a ON true
        LEFT JOIN programmes pr ON pr.id = a.programme_id
        LEFT JOIN campuses c ON c.id = pr.campus_id
        LEFT JOIN intakes i ON i.id = a.intake_id
        WHERE p.lifecycle_state = 'lead'
    )
    SELECT * FROM lead_data
    WHERE (%s::text IS NULL OR (
        (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) ILIKE %s
        OR email ILIKE %s
    ))
    ORDER BY lead_score DESC NULLS LAST, created_at DESC
    LIMIT %s::int
    """
    
    pattern = f"%{q}%" if q else None
    
    try:
        # Run the optimized query
        result = await fetch(sql, q, pattern, pattern, limit)
        
        query_time = (time.time() - start_time) * 1000
        logger.info(f"Optimized leads query completed in {query_time:.2f}ms")
        
        return result
    except Exception as e:
        logger.error(f"Database error in optimized leads query: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch leads data. Check server logs for details."
        )

@router.get("/admissions-optimized", response_model=List[dict])
@cached(ttl=300)  # Cache for 5 minutes
async def list_admissions_optimized(
    q: Optional[str] = Query(None, description="name or email search"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Optimized admissions listing with better performance.
    """
    start_time = time.time()
    
    sql = """
    WITH admission_data AS (
        SELECT 
            p.id::text,
            p.first_name,
            p.last_name,
            p.email,
            p.phone,
            p.lifecycle_state,
            p.lead_score,
            p.conversion_probability::float,
            p.assigned_to,
            p.status,
            p.next_follow_up,
            p.created_at,
            p.updated_at,
            -- Latest application info
            a.stage as latest_application_stage,
            pr.name as latest_programme_name,
            c.name as latest_campus_name,
            i.cycle_label as latest_academic_year,
            COALESCE(p.updated_at, p.created_at) as last_activity_at
        FROM people p
        LEFT JOIN LATERAL (
            SELECT 
                ap.stage,
                ap.programme_id,
                ap.intake_id
            FROM applications ap
            WHERE ap.person_id = p.id
            ORDER BY ap.created_at DESC
            LIMIT 1
        ) a ON true
        LEFT JOIN programmes pr ON pr.id = a.programme_id
        LEFT JOIN campuses c ON c.id = pr.campus_id
        LEFT JOIN intakes i ON i.id = a.intake_id
        WHERE p.lifecycle_state IN ('lead', 'applicant')
    )
    SELECT * FROM admission_data
    WHERE (%s::text IS NULL OR (
        (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) ILIKE %s
        OR email ILIKE %s
    ))
    ORDER BY created_at DESC
    LIMIT %s::int
    """
    
    pattern = f"%{q}%" if q else None
    
    try:
        result = await fetch(sql, q, pattern, pattern, limit)
        
        query_time = (time.time() - start_time) * 1000
        logger.info(f"Optimized admissions query completed in {query_time:.2f}ms")
        
        return result
    except Exception as e:
        logger.error(f"Database error in optimized admissions query: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch admissions data. Check server logs for details."
        )

@router.get("/student-records-optimized", response_model=List[dict])
@cached(ttl=300)  # Cache for 5 minutes
async def list_student_records_optimized(
    q: Optional[str] = Query(None, description="name or email search"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Optimized student records listing with better performance.
    """
    start_time = time.time()
    
    sql = """
    WITH student_data AS (
        SELECT 
            p.id::text,
            p.first_name,
            p.last_name,
            p.email,
            p.phone,
            p.lifecycle_state,
            p.lead_score,
            p.conversion_probability::float,
            p.assigned_to,
            p.status,
            p.next_follow_up,
            p.created_at,
            p.updated_at,
            -- Latest application info
            a.stage as latest_application_stage,
            pr.name as latest_programme_name,
            c.name as latest_campus_name,
            i.cycle_label as latest_academic_year,
            COALESCE(p.updated_at, p.created_at) as last_activity_at
        FROM people p
        LEFT JOIN LATERAL (
            SELECT 
                ap.stage,
                ap.programme_id,
                ap.intake_id
            FROM applications ap
            WHERE ap.person_id = p.id
            ORDER BY ap.created_at DESC
            LIMIT 1
        ) a ON true
        LEFT JOIN programmes pr ON pr.id = a.programme_id
        LEFT JOIN campuses c ON c.id = pr.campus_id
        LEFT JOIN intakes i ON i.id = a.intake_id
        WHERE p.lifecycle_state IN ('student', 'enrolled')
    )
    SELECT * FROM student_data
    WHERE (%s::text IS NULL OR (
        (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) ILIKE %s
        OR email ILIKE %s
    ))
    ORDER BY created_at DESC
    LIMIT %s::int
    """
    
    pattern = f"%{q}%" if q else None
    
    try:
        result = await fetch(sql, q, pattern, pattern, limit)
        
        query_time = (time.time() - start_time) * 1000
        logger.info(f"Optimized student records query completed in {query_time:.2f}ms")
        
        return result
    except Exception as e:
        logger.error(f"Database error in optimized student records query: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch student records data. Check server logs for details."
        )

@router.get("/performance-stats")
async def get_performance_stats():
    """
    Get performance statistics for the people endpoints.
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
        await fetch("SELECT COUNT(*) FROM people WHERE lifecycle_state = 'lead'")
        count_time = (time.time() - start_time) * 1000
        
        return {
            "cache_stats": cache_stats,
            "database_performance": {
                "count_query_ms": count_time
            },
            "optimization_status": "Active"
        }
    except Exception as e:
        logger.error(f"Error getting performance stats: {e}")
        return {"error": str(e)}
