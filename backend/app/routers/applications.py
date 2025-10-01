from fastapi import APIRouter, Query, HTTPException, Path, Body
from typing import List, Optional, Dict, Any
from uuid import UUID
from app.db.db import fetch, execute, fetchrow
from app.schemas.applications import ApplicationCard, StageMoveIn, StageMoveOut

router = APIRouter()

# Unified stage constants
ALLOWED_STAGES = {
    "enquiry": "Enquiry",
    "applicant": "Application Submitted", 
    "interview": "Interview",
    "offer": "Offer Made",
    "enrolled": "Enrolled"
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
        (days_in_pipeline)::int as days_in_pipeline,
        sla_overdue,
        has_offer,
        has_active_interview,
        last_activity_at,
        offer_type
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

    # Stage gating validation
    blockers = []
    if to_stage == "interview":
        # Must have email and a pending interview slot
        row = await fetchrow("""
          select p.email, exists(select 1 from interviews iv where iv.application_id=%s and (iv.outcome is null or iv.outcome='pending')) as has_iv
          from applications a join people p on p.id=a.person_id where a.id=%s
        """, application_id, application_id)
        if not row or not row.get("email"):
            blockers.append("Missing email")
        if not row or not row.get("has_iv"):
            blockers.append("No scheduled interview")
    
    elif to_stage == "offer":
        # Must have completed interview
        row = await fetchrow("""
          select exists(select 1 from interviews iv where iv.application_id=%s and iv.outcome='completed') as has_completed_iv
          from applications a where a.id=%s
        """, application_id, application_id)
        if not row or not row.get("has_completed_iv"):
            blockers.append("No completed interview")
    
    elif to_stage == "enrolled":
        # Must have accepted offer
        row = await fetchrow("""
          select exists(select 1 from offers o where o.application_id=%s and o.status='accepted') as has_accepted_offer
          from applications a where a.id=%s
        """, application_id, application_id)
        if not row or not row.get("has_accepted_offer"):
            blockers.append("No accepted offer")

    if blockers:
        raise HTTPException(status_code=422, detail={"blockers": blockers})

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
            
            # Apply stage gating (simplified for bulk operations)
            blockers = []
            if to_stage == "interview":
                row = await fetchrow("""
                  select p.email, exists(select 1 from interviews iv where iv.application_id=%s and (iv.outcome is null or iv.outcome='pending')) as has_iv
                  from applications a join people p on p.id=a.person_id where a.id=%s
                """, app_id, app_id)
                if not row or not row.get("email"):
                    blockers.append("Missing email")
                if not row or not row.get("has_iv"):
                    blockers.append("No scheduled interview")
            
            if blockers:
                failed.append({"id": app_id, "error": f"Blockers: {', '.join(blockers)}"})
                continue
            
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
    
    # Get activity history
    activities = await fetch("""
        select activity_type, activity_title, activity_description, created_at, metadata
        from lead_activities
        where person_id = %s
        order by created_at desc
        limit 20
    """, app["person_id"])
    
    # Get interviews
    interviews = await fetch("""
        select id, scheduled_at, outcome, notes, created_at
        from interviews
        where application_id = %s
        order by scheduled_at desc
    """, application_id)
    
    # Get offers
    offers = await fetch("""
        select id, offer_type, status, created_at, accepted_at, notes
        from offers
        where application_id = %s
        order by created_at desc
    """, application_id)
    
    return {
        "application": app,
        "tasks": tasks,
        "activities": activities,
        "interviews": interviews,
        "offers": offers
    }

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


