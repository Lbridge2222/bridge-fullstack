from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.db.db import fetch, execute
from app.schemas.people import PersonOut, PeoplePage

router = APIRouter()

@router.get("", response_model=PeoplePage)
@router.get("/", response_model=PeoplePage)
async def list_people(
    lifecycle_state: Optional[str] = Query(None, description="e.g. enquiry|pre_applicant|applicant|enrolled|student|alumni"),
    q: Optional[str] = Query(None, description="name or email search"),
    limit: int = Query(50, ge=1, le=200),
    cursor: Optional[str] = Query(None, description="created_at ISO cursor")
):
    """
    Returns real people from the DB.
    - Filters by lifecycle_state (optional)
    - Full-text-ish search on name/email (optional)
    - Uses keyset-friendly order (created_at desc) with limit
    """
    sql = """
      select id, first_name, last_name, email, phone, lifecycle_state, created_at
      from people
      where (%s::text is null or lifecycle_state = %s)
        and (%s::text is null or (
          (coalesce(first_name,'') || ' ' || coalesce(last_name,'')) ilike %s
          or email ilike %s
        ))
        and (%s::timestamptz is null or created_at < %s)
      order by created_at desc
      limit %s::int
    """
    pattern = f"%{q}%" if q else None
    try:
        rows = await fetch(
            sql,
            lifecycle_state, lifecycle_state,
            q, pattern, pattern,
            cursor, cursor,
            limit + 1,
        )
        items = rows[:limit]
        next_cursor = items[-1]["created_at"].isoformat() if len(rows) > limit else None
        return {"items": items, "next_cursor": next_cursor}
    except Exception as e:
        # Surface the actual issue so we can fix it
        raise HTTPException(status_code=500, detail=f"/people DB error: {e}")

@router.get("/enriched", response_model=List[dict])
async def list_people_enriched(
    lifecycle_state: Optional[str] = Query(None, description="e.g. enquiry|pre_applicant|applicant|enrolled|student|alumni"),
    q: Optional[str] = Query(None, description="name or email search"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Returns enriched people data including latest application and activity info.
    """
    sql = """
      select * from vw_people_enriched
      where (%s::text is null or lifecycle_state = %s)
        and (%s::text is null or (
          (coalesce(first_name,'') || ' ' || coalesce(last_name,'')) ilike %s
          or email ilike %s
        ))
      order by created_at desc
      limit %s::int
    """
    pattern = f"%{q}%" if q else None
    try:
        return await fetch(sql, lifecycle_state, lifecycle_state, q, pattern, pattern, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/people/enriched DB error: {e}")

@router.get("/leads", response_model=List[dict])
async def list_leads(
    q: Optional[str] = Query(None, description="name or email search"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Returns people in enquiry stage - for leads management.
    """
    sql = """
      select 
        id::text,
        first_name,
        last_name,
        email,
        lifecycle_state,
        latest_application_stage,
        lead_score,
        conversion_probability::float,
        created_at
      from vw_leads_management
      where (%s::text is null or (
        (coalesce(first_name,'') || ' ' || coalesce(last_name,'')) ilike %s
        or email ilike %s
      ))
      order by created_at desc
      limit %s::int
    """
    pattern = f"%{q}%" if q else None
    try:
        # First test if the view exists and has data
        test_sql = "SELECT COUNT(*) as count FROM vw_leads_management"
        count_result = await fetch(test_sql)
        print(f"DEBUG: View test result: {count_result}")
        
        # Now run the actual query
        result = await fetch(sql, q, pattern, pattern, limit)
        print(f"DEBUG: Query result count: {len(result) if result else 0}")
        return result
    except Exception as e:
        import traceback
        error_detail = f"/people/leads DB error: {str(e)}\nTraceback: {traceback.format_exc()}"
        print(f"DEBUG: Full error: {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/admissions", response_model=List[dict])
async def list_admissions(
    q: Optional[str] = Query(None, description="name or email search"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Returns people in pre_applicant or applicant stage - for admissions management.
    """
    sql = """
      select * from vw_admissions_management
      where (%s::text is null or (
        (coalesce(first_name,'') || ' ' || coalesce(last_name,'')) ilike %s
        or email ilike %s
      ))
      order by id desc
      limit %s::int
    """
    pattern = f"%{q}%" if q else None
    try:
        return await fetch(sql, q, pattern, pattern, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/people/admissions DB error: {e}")

@router.get("/student-records", response_model=List[dict])
async def list_student_records(
    q: Optional[str] = Query(None, description="name or email search"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Returns people in student or enrolled stage - for student records.
    """
    sql = """
      select * from vw_student_records
      where (%s::text is null or (
        (coalesce(first_name,'') || ' ' || coalesce(last_name,'')) ilike %s
        or email ilike %s
      ))
      order by id desc
      limit %s::int
    """
    pattern = f"%{q}%" if q else None
    try:
        return await fetch(sql, q, pattern, pattern, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/people/student-records DB error: {e}")

@router.post("/{person_id}/promote")
async def promote_person(
    person_id: str,
    new_state: str,
    reason: Optional[str] = None
):
    """
    Manually promote a person through lifecycle states.
    """
    try:
        result = await execute(
            "select promote_lifecycle_state(%s, %s, %s)",
            person_id, new_state, reason
        )
        return {"message": "Person promoted successfully", "person_id": person_id, "new_state": new_state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Promotion failed: {e}")

@router.get("/_debug")
async def people_debug():
    return {"router_file": __file__}

@router.get("/_debug/people")
async def debug_people():
    """Debug endpoint to test basic people table access"""
    try:
        # Test basic people table
        people_count = await fetch("SELECT COUNT(*) as count FROM people")
        print(f"DEBUG: People table count: {people_count}")
        
        # Test basic people with lifecycle_state = 'enquiry'
        enquiry_count = await fetch("SELECT COUNT(*) as count FROM people WHERE lifecycle_state = 'enquiry'")
        print(f"DEBUG: Enquiry count: {enquiry_count}")
        
        # Test a simple enquiry record
        enquiry_sample = await fetch("SELECT id::text, first_name, last_name, lifecycle_state FROM people WHERE lifecycle_state = 'enquiry' LIMIT 1")
        print(f"DEBUG: Enquiry sample: {enquiry_sample}")
        
        return {
            "people_table_accessible": True,
            "total_people": people_count[0]["count"] if people_count else 0,
            "enquiry_count": enquiry_count[0]["count"] if enquiry_count else 0,
            "enquiry_sample": enquiry_sample[0] if enquiry_sample else None,
            "message": "People table is working"
        }
    except Exception as e:
        import traceback
        error_detail = f"People table error: {str(e)}\nTraceback: {traceback.format_exc()}"
        print(f"DEBUG: {error_detail}")
        return {
            "people_table_accessible": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "message": "Error accessing people table"
        }

@router.get("/_debug/leads")
async def debug_leads():
    """Debug endpoint to test the leads view structure"""
    try:
        # Test if view exists
        view_test = await fetch("SELECT COUNT(*) as count FROM vw_leads_management")
        print(f"DEBUG: View count test: {view_test}")
        
        # Test a simple select 
        sample = await fetch("SELECT id::text, first_name, lifecycle_state FROM vw_leads_management LIMIT 1")
        print(f"DEBUG: Sample record test: {sample}")
        
        # Test the exact columns we're using
        columns_test = await fetch("""
            SELECT 
                id::text,
                first_name,
                last_name,
                email,
                lifecycle_state,
                latest_application_stage,
                lead_score,
                conversion_probability::float,
                created_at
            FROM vw_leads_management 
            LIMIT 1
        """)
        print(f"DEBUG: Columns test: {columns_test}")
        
        return {
            "view_accessible": True,
            "total_count": view_test[0]["count"] if view_test else 0,
            "sample_record": sample[0] if sample else None,
            "columns_test": columns_test[0] if columns_test else None,
            "message": "Leads view is working"
        }
    except Exception as e:
        import traceback
        error_detail = f"Debug error: {str(e)}\nTraceback: {traceback.format_exc()}"
        print(f"DEBUG: {error_detail}")
        return {
            "view_accessible": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "message": "Error accessing leads view"
        }