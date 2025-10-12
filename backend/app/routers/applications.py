from fastapi import APIRouter, Query, HTTPException, Path, Body
from typing import List, Optional, Dict, Any
from uuid import UUID
from app.db.db import fetch, execute, fetchrow
from app.schemas.applications import ApplicationCard, StageMoveIn, StageMoveOut

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

@router.get("/board", response_model=List[ApplicationCard])
@router.get("/board/", response_model=List[ApplicationCard])
async def board(
    stage: Optional[str] = Query(None),
    assignee: Optional[UUID] = Query(None),
    priority: Optional[str] = Query(None, description="critical|high|medium|low"),
    urgency: Optional[str] = Query(None, description="high|medium|low"),
    limit: int = Query(100, ge=1, le=500)
):
    sql = """
      select 
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
      from vw_board_applications
      where (%s::text is null or stage = %s::text)
        and (%s::uuid is null or assignee_user_id = %s::uuid)
        and (%s::text is null or priority = %s::text)
        and (%s::text is null or urgency = %s::text)
      order by created_at desc
      limit %s::int
    """
    try:
        return await fetch(sql, stage, stage, assignee, assignee, priority, priority, urgency, urgency, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/applications/board DB error: {e}")

@router.post("/board/_refresh", status_code=204)
async def refresh_board_mv():
    try:
        await execute("refresh materialized view concurrently vw_board_applications;")
    except Exception:
        # Fallback if concurrently not allowed
        await execute("refresh materialized view vw_board_applications;")
    return None

@router.get("/stages")
async def list_stages():
    """Get all available stages with their display labels"""
    return [{"id": stage_id, "label": stage_label} for stage_id, stage_label in ALLOWED_STAGES.items()]

@router.patch("/{application_id}/stage", response_model=StageMoveOut)
async def move_stage(
    application_id: UUID = Path(...),
    payload: StageMoveIn = Body(...)
):
    to_stage = payload.to_stage.strip().lower()
    if to_stage not in ALLOWED_STAGES:
        raise HTTPException(status_code=422, detail=f"Invalid stage '{to_stage}'")

    # Read current stage and application details
    rows = await fetch(
        """
        select org_id, stage
        from applications
        where id = %s
        """,
        application_id,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Application not found")

    from_stage = rows[0]["stage"]
    if from_stage == to_stage:
        raise HTTPException(status_code=409, detail="Stage unchanged")

    # No stage validation - allow free movement between all stages
    # This simplifies the user experience and allows flexible workflow management

    # Update stage
    await execute(
        "update applications set stage = %s where id = %s",
        to_stage, application_id,
    )

    # Audit
    await execute(
        """
        insert into pipeline_history (application_id, from_stage, to_stage, changed_by, note)
        values (%s, %s, %s, %s, %s)
        """,
        application_id, from_stage, to_stage, payload.changed_by, payload.note,
    )

    # Refresh MV best-effort
    try:
        await execute("refresh materialized view concurrently vw_board_applications;")
    except Exception:
        await execute("refresh materialized view vw_board_applications;")

    return {"application_id": application_id, "from_stage": from_stage, "to_stage": to_stage}

@router.patch("/{application_id}/priority")
async def update_priority(
    application_id: UUID = Path(...),
    payload: dict = Body(...)
):
    priority = payload.get("priority")
    if priority not in ["critical", "high", "medium", "low"]:
        raise HTTPException(status_code=422, detail="Invalid priority")
    
    urgency_reason = payload.get("urgency_reason")
    
    await execute(
        "update applications set priority = %s, urgency_reason = %s where id = %s",
        priority, urgency_reason, application_id
    )
    
    # Refresh MV
    try:
        await execute("refresh materialized view concurrently vw_board_applications;")
    except Exception:
        await execute("refresh materialized view vw_board_applications;")
    
    return {"ok": True}

@router.post("/bulk/stage")
async def bulk_move_stage(payload: Dict[str, Any] = Body(...)):
    """Bulk move applications to a new stage"""
    application_ids = payload.get("application_ids", [])
    to_stage = payload.get("to_stage")
    note = payload.get("note", "Bulk stage update")
    changed_by = payload.get("changed_by")
    
    if not application_ids or not to_stage:
        raise HTTPException(status_code=422, detail="Missing application_ids or to_stage")
    
    if to_stage not in ALLOWED_STAGES:
        raise HTTPException(status_code=422, detail=f"Invalid stage '{to_stage}'")
    
    successful = []
    failed = []
    
    for app_id in application_ids:
        try:
            # Check if application exists and get current stage
            rows = await fetch(
                "select stage from applications where id = %s",
                app_id
            )
            if not rows:
                failed.append({"id": app_id, "error": "Application not found"})
                continue
                
            from_stage = rows[0]["stage"]
            if from_stage == to_stage:
                failed.append({"id": app_id, "error": "Stage unchanged"})
                continue
            
            # No stage validation - allow free movement between all stages
            # This simplifies the user experience and allows flexible workflow management
            
            # Update stage
            await execute(
                "update applications set stage = %s where id = %s",
                to_stage, app_id
            )
            
            # Audit
            await execute(
                """
                insert into pipeline_history (application_id, from_stage, to_stage, changed_by, note)
                values (%s, %s, %s, %s, %s)
                """,
                app_id, from_stage, to_stage, changed_by, note
            )
            
            successful.append({"id": app_id, "from_stage": from_stage, "to_stage": to_stage})
            
        except Exception as e:
            failed.append({"id": app_id, "error": str(e)})
    
    # Refresh MV
    try:
        await execute("refresh materialized view concurrently vw_board_applications;")
    except Exception:
        await execute("refresh materialized view vw_board_applications;")
    
    return {
        "total_processed": len(application_ids),
        "successful": len(successful),
        "failed": len(failed),
        "successful_items": successful,
        "failed_items": failed
    }

@router.post("/bulk/priority")
async def bulk_update_priority(payload: Dict[str, Any] = Body(...)):
    """Bulk update application priorities"""
    application_ids = payload.get("application_ids", [])
    priority = payload.get("priority")
    urgency_reason = payload.get("urgency_reason")
    
    if not application_ids or not priority:
        raise HTTPException(status_code=422, detail="Missing application_ids or priority")
    
    if priority not in ["critical", "high", "medium", "low"]:
        raise HTTPException(status_code=422, detail="Invalid priority")
    
    successful = []
    failed = []
    
    for app_id in application_ids:
        try:
            # Check if application exists
            rows = await fetch("select id from applications where id = %s", app_id)
            if not rows:
                failed.append({"id": app_id, "error": "Application not found"})
                continue
            
            # Update priority
            await execute(
                "update applications set priority = %s, urgency_reason = %s where id = %s",
                priority, urgency_reason, app_id
            )
            
            successful.append({"id": app_id, "priority": priority})
            
        except Exception as e:
            failed.append({"id": app_id, "error": str(e)})
    
    # Refresh MV
    try:
        await execute("refresh materialized view concurrently vw_board_applications;")
    except Exception:
        await execute("refresh materialized view vw_board_applications;")
    
    return {
        "total_processed": len(application_ids),
        "successful": len(successful),
        "failed": len(failed),
        "successful_items": successful,
        "failed_items": failed
    }

@router.get("/{application_id}/details")
async def get_application_details(application_id: UUID = Path(...)):
    """Get detailed information for an application including tasks, activity, interviews, offers"""
    try:
        # Get basic application info
        app_rows = await fetch("""
            select a.*, p.first_name, p.last_name, p.email, p.phone
            from applications a
            join people p on p.id = a.person_id
            where a.id = %s
        """, application_id)
        
        if not app_rows:
            raise HTTPException(status_code=404, detail="Application not found")
        
        app = app_rows[0]
        
        # Get tasks (placeholder - would need application_tasks table)
        tasks = []
        
        # Get activity history (with error handling)
        activities = []
        try:
            activities = await fetch("""
                select activity_type, activity_title, activity_description, created_at, metadata
                from lead_activities
                where lead_id = %s
                order by created_at desc
                limit 20
            """, str(app["person_id"]))
        except Exception as e:
            print(f"Error fetching activities: {e}")
            activities = []
        
        # Get interviews (with error handling)
        interviews = []
        try:
            interviews = await fetch("""
                select id, scheduled_start, scheduled_end, outcome, notes, created_at
                from interviews
                where application_id = %s
                order by scheduled_start desc
            """, application_id)
        except Exception as e:
            print(f"Error fetching interviews: {e}")
            interviews = []
        
        # Get offers (with error handling)
        offers = []
        try:
            offers = await fetch("""
                select id, type, status, issued_at, expires_at, conditions
                from offers
                where application_id = %s
                order by issued_at desc
            """, application_id)
        except Exception as e:
            print(f"Error fetching offers: {e}")
            offers = []
        
        return {
            "application": app,
            "tasks": tasks,
            "activities": activities,
            "interviews": interviews,
            "offers": offers
        }
    except Exception as e:
        print(f"Error in get_application_details: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/stats")
async def get_application_stats():
    """Get application statistics for quick filters"""
    stats = await fetchrow("""
        select 
            count(*) as total,
            count(case when priority = 'critical' then 1 end) as critical_count,
            count(case when urgency = 'high' then 1 end) as high_urgency_count,
            count(case when conversion_probability > 0.8 then 1 end) as high_conversion_count,
            count(case when days_in_pipeline > 30 then 1 end) as stuck_count,
            count(case when last_activity_at < now() - interval '7 days' then 1 end) as no_activity_count
        from vw_board_applications
    """)
    
    return {
        "total": stats["total"] or 0,
        "critical_priority": stats["critical_count"] or 0,
        "high_urgency": stats["high_urgency_count"] or 0,
        "high_conversion": stats["high_conversion_count"] or 0,
        "stuck_over_30_days": stats["stuck_count"] or 0,
        "no_activity_over_7_days": stats["no_activity_count"] or 0
    }


# ============================================================================
# Application Data Update Endpoints (with Audit Logging)
# ============================================================================

@router.patch("/{application_id}/field")
async def update_application_field(
    application_id: UUID = Path(...),
    field_name: str = Body(...),
    old_value: Any = Body(None),
    new_value: Any = Body(...),
    user_id: Optional[UUID] = Body(None),
    change_reason: Optional[str] = Body(None)
):
    """
    Update a single field on an application with automatic audit logging.
    
    This endpoint is used for inline editing of application data.
    The database trigger will automatically log the change.
    """
    try:
        # Validate field name (security - only allow specific fields)
        allowed_fields = [
            'stage', 'status', 'priority', 'urgency', 'urgency_reason',
            'source', 'sub_source', 'assignee_user_id', 'programme_id', 
            'intake_id', 'decision_factors'
        ]
        
        if field_name not in allowed_fields:
            raise HTTPException(status_code=400, detail=f"Field '{field_name}' is not editable")
        
        # Build dynamic update query
        if field_name == 'decision_factors':
            # For JSONB fields, merge with existing data
            query = f"""
                UPDATE applications
                SET {field_name} = COALESCE({field_name}, '{{}}'::jsonb) || %s::jsonb,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """
            import json
            result = await fetchrow(query, json.dumps(new_value), application_id)
        else:
            # For regular fields, direct update
            query = f"""
                UPDATE applications
                SET {field_name} = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """
            result = await fetchrow(query, new_value, application_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Manual audit log entry with user context (trigger handles field-level, this adds context)
        if user_id:
            await execute("""
                INSERT INTO application_audit_log (
                    application_id,
                    field_name,
                    old_value,
                    new_value,
                    operation,
                    changed_by_user_id,
                    change_reason,
                    change_source
                ) VALUES (%s, %s, %s, %s, 'UPDATE', %s, %s, 'api')
            """, application_id, field_name, 
                json.dumps(old_value) if old_value is not None else None,
                json.dumps(new_value),
                user_id, change_reason)
        
        return {
            "success": True,
            "application_id": str(application_id),
            "field_name": field_name,
            "new_value": new_value,
            "updated_at": result["updated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating application field: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update field: {str(e)}")


@router.get("/{application_id}/audit-log")
async def get_application_audit_log(
    application_id: UUID = Path(...),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    Get audit log for an application showing all changes made.
    
    Returns detailed audit trail with user info and change descriptions.
    """
    try:
        # Get audit log entries
        audit_entries = await fetch("""
            SELECT 
                id,
                application_id,
                operation,
                field_name,
                old_value,
                new_value,
                changed_at,
                changed_by_user_id,
                changed_by_user_email,
                changed_by_user_name,
                change_reason,
                change_source,
                is_sensitive_field,
                requires_approval,
                approved_by_user_id,
                approved_at
            FROM application_audit_log
            WHERE application_id = %s
            ORDER BY changed_at DESC
            LIMIT %s OFFSET %s
        """, application_id, limit, offset)
        
        # Get total count
        total_row = await fetchrow("""
            SELECT COUNT(*) as total
            FROM application_audit_log
            WHERE application_id = %s
        """, application_id)
        
        # Get summary stats
        summary_row = await fetchrow("""
            SELECT * FROM get_application_audit_summary(%s)
        """, application_id)
        
        return {
            "audit_entries": audit_entries,
            "total": total_row["total"] if total_row else 0,
            "limit": limit,
            "offset": offset,
            "summary": dict(summary_row) if summary_row else {}
        }
        
    except Exception as e:
        print(f"Error fetching audit log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit log: {str(e)}")


@router.get("/{application_id}/audit-trail")
async def get_application_audit_trail(
    application_id: UUID = Path(...),
    limit: int = Query(50, ge=1, le=500)
):
    """
    Get human-readable audit trail for an application.
    
    Uses the vw_application_audit_trail view for formatted output.
    """
    try:
        audit_trail = await fetch("""
            SELECT 
                audit_id,
                application_id,
                applicant_name,
                operation,
                field_name,
                change_type,
                change_description,
                changed_at,
                user_full_name,
                user_email,
                change_reason,
                change_source,
                is_sensitive_field
            FROM vw_application_audit_trail
            WHERE application_id = %s
            ORDER BY changed_at DESC
            LIMIT %s
        """, application_id, limit)
        
        return {
            "audit_trail": audit_trail,
            "total": len(audit_trail)
        }
        
    except Exception as e:
        print(f"Error fetching audit trail: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit trail: {str(e)}")


