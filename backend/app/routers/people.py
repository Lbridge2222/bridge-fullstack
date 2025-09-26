from fastapi import APIRouter, Query, HTTPException
import logging
from typing import List, Optional
from app.db.db import fetch, execute
from app.schemas.people import PersonOut, PeoplePage, PersonUpdate, LeadUpdate, LeadNote, PropertyUpdate, assert_no_system_fields
from app.cache import cached

logger = logging.getLogger(__name__)
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

@router.get("/{person_id}/enriched", response_model=dict)
async def get_person_enriched(person_id: str):
    """
    Returns a single person's enriched record from vw_people_enriched.
    """
    sql = """
      select * from vw_people_enriched
      where id::text = %s
      limit 1
    """
    try:
        rows = await fetch(sql, person_id)
        if not rows:
            raise HTTPException(status_code=404, detail="Person not found")

        enriched = rows[0]

        # Always override standard fields from live people table to avoid MV staleness
        live = await fetch(
            """
            select first_name,
                   last_name,
                   email,
                   phone,
                   date_of_birth,
                   nationality,
                   lifecycle_state,
                   lead_score,
                   conversion_probability,
                   updated_at
            from people
            where id::text = %s
            limit 1
            """,
            person_id,
        )
        if live:
            live_row = live[0]
            # Log the reconciliation for debugging
            logger.info(
                "GET /people/%s/enriched reconcile phone: mv=%s live=%s",
                person_id,
                enriched.get("phone"),
                live_row.get("phone"),
            )
            logger.info(
                "GET /people/%s/enriched reconcile date_of_birth: mv=%s live=%s",
                person_id,
                enriched.get("date_of_birth"),
                live_row.get("date_of_birth"),
            )
            for key in [
                "first_name",
                "last_name",
                "email",
                "phone",
                "date_of_birth",
                "nationality",
                "lifecycle_state",
                "lead_score",
                "conversion_probability",
                "updated_at",
            ]:
                if key in live_row and live_row[key] is not None:
                    enriched[key] = live_row[key]

        return enriched
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/people/{{person_id}}/enriched DB error: {e}")

@router.get("/leads", response_model=List[dict])
@cached(ttl=60)  # Cache for 1 minute
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
        phone,
        lifecycle_state,
        latest_application_stage,
        latest_programme_name,
        latest_campus_name,
        latest_academic_year,
        lead_score,
        conversion_probability::float,
        assigned_to,
        status,
        next_follow_up,
        created_at,
        updated_at,
        created_at as last_activity_at,
        'enquiry' as last_activity_kind,
        'Initial contact required' as last_activity_title
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
        # Run the query
        result = await fetch(sql, q, pattern, pattern, limit)
        return result
    except Exception as e:
        import logging
        import traceback
        
        # Log full error details server-side (safe for debugging)
        log = logging.getLogger("people.leads")
        log.error("Database error in /people/leads: %s", str(e))
        log.error("Full traceback: %s", traceback.format_exc())
        log.error("Query parameters: q=%s, pattern=%s, limit=%s", q, pattern, limit)
        
        # Return generic error to client (no sensitive details)
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch leads data. Check server logs for details."
        )

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
        
        # Test basic people with lifecycle_state = 'enquiry'
        enquiry_count = await fetch("SELECT COUNT(*) as count FROM people WHERE lifecycle_state = 'enquiry'")
        
        # Test a simple enquiry record
        enquiry_sample = await fetch("SELECT id::text, first_name, last_name, lifecycle_state FROM people WHERE lifecycle_state = 'enquiry' LIMIT 1")
        
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
        
        # Test a simple select 
        sample = await fetch("SELECT id::text, first_name, lifecycle_state FROM vw_leads_management LIMIT 1")
        
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

# New update endpoints for bidirectional data flow
@router.patch("/{person_id}")
async def update_person(person_id: str, update: PersonUpdate):
    """
    Update a person's basic information.
    """
    try:
        logger.info("PATCH /people/%s payload=%s", person_id, update.dict(exclude_unset=True))
        # Guard against system fields (defense-in-depth; PersonUpdate doesn't expose them, but protect anyway)
        assert_no_system_fields(update.dict(exclude_unset=True))

        # Build dynamic update query based on provided fields
        update_fields = []
        params = []
        param_count = 1
        
        if update.first_name is not None:
            update_fields.append(f"first_name = %s")
            params.append(update.first_name)
            param_count += 1
            
        if update.last_name is not None:
            update_fields.append(f"last_name = %s")
            params.append(update.last_name)
            param_count += 1
            
        if update.email is not None:
            update_fields.append(f"email = %s")
            params.append(update.email)
            param_count += 1
            
        if update.phone is not None:
            update_fields.append(f"phone = %s")
            params.append(update.phone)
            param_count += 1
            
        if update.date_of_birth is not None:
            update_fields.append(f"date_of_birth = %s")
            params.append(update.date_of_birth)
            logger.info(f"🔧 DEBUG: Adding date_of_birth = {update.date_of_birth} to update query")
            param_count += 1
            
        if update.nationality is not None:
            update_fields.append(f"nationality = %s")
            params.append(update.nationality)
            param_count += 1
            
        if update.programme is not None:
            update_fields.append(f"programme = %s")
            params.append(update.programme)
            param_count += 1
            
        if update.lifecycle_state is not None:
            update_fields.append(f"lifecycle_state = %s")
            params.append(update.lifecycle_state)
            param_count += 1
        
        if not update_fields:
            raise HTTPException(status_code=422, detail="No fields to update")
        
        # Add updated_at timestamp
        update_fields.append("updated_at = NOW()")
        
        sql = f"""
            UPDATE people 
            SET {', '.join(update_fields)}
            WHERE id::text = %s
        """
        params.append(person_id)

        logger.info(f"🔧 DEBUG: Executing SQL: {sql}")
        logger.info(f"🔧 DEBUG: With params: {params}")

        # Use execute for UPDATE and then fetch the updated row
        await execute(sql, *params)
        
        # Fetch the updated row to return it
        fetch_sql = """
            SELECT id::text, first_name, last_name, email, phone, date_of_birth, nationality, lifecycle_state, updated_at
            FROM people 
            WHERE id::text = %s
        """
        rows = await fetch(fetch_sql, person_id)

        if not rows:
            raise HTTPException(status_code=404, detail="Person not found")

        logger.info("PATCH /people/%s success fields=%s", person_id, ', '.join([f.split('=')[0].strip() for f in update_fields]))
        logger.info(f"🔧 DEBUG: Database returned: {rows[0]}")
        
        # Verify the update by querying the database again
        logger.info("🔧 DEBUG: Verifying update by querying database again...")
        verify_sql = "SELECT id, first_name, last_name, date_of_birth, phone, updated_at FROM people WHERE id::text = %s"
        verify_rows = await fetch(verify_sql, person_id)
        if verify_rows:
            logger.info(f"🔧 DEBUG: Verification query returned: {verify_rows[0]}")
        else:
            logger.error("🔧 DEBUG: Verification query returned no rows!")
        
        # Test a direct update to see if it works
        logger.info("🔧 DEBUG: Testing direct update...")
        test_sql = "UPDATE people SET date_of_birth = %s WHERE id::text = %s RETURNING date_of_birth"
        test_rows = await fetch(test_sql, "1989-09-25", person_id)
        if test_rows:
            logger.info(f"🔧 DEBUG: Direct update test returned: {test_rows[0]}")
        else:
            logger.error("🔧 DEBUG: Direct update test failed!")
        
        return {
            "message": "Person updated successfully",
            "person": rows[0]
        }

    except HTTPException:
        # Preserve intended status codes
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {e}")


@router.patch("/{person_id}/properties")
async def upsert_person_property(person_id: str, body: PropertyUpdate):
    """
    Upsert a custom property for a person into custom_values.
    Accepts either property_id or property_name + org-scoped resolution.
    """
    try:
        # Resolve property by id or name
        if body.property_id is None and (body.property_name is None or not body.property_name.strip()):
            raise HTTPException(status_code=422, detail="Either property_id or property_name is required")

        # Get org_id for the person to ensure scoping
        person_row = await fetch("select org_id from people where id::text = %s", person_id)
        if not person_row:
            raise HTTPException(status_code=404, detail="Person not found")
        org_id = person_row[0]["org_id"]

        if body.property_id is not None:
            prop_rows = await fetch("select id, name, data_type, label from custom_properties where id = %s and org_id = %s", str(body.property_id), org_id)
        else:
            prop_rows = await fetch("select id, name, data_type, label from custom_properties where name = %s and entity = 'people' and org_id = %s", body.property_name, org_id)

        if not prop_rows:
            raise HTTPException(status_code=404, detail="Property metadata not found")
        prop = prop_rows[0]

        # Optional: validate/coerce value by data_type (basic types)
        value = body.value
        dt = body.data_type or prop.get("data_type")
        if dt in ("number",):
            try:
                value = float(value)
            except Exception:
                raise HTTPException(status_code=422, detail="Invalid number value")
        elif dt in ("boolean",):
            if isinstance(value, str):
                value_lower = value.lower()
                if value_lower in ("true","1","yes"): value = True
                elif value_lower in ("false","0","no"): value = False
                else: raise HTTPException(status_code=422, detail="Invalid boolean value")
            value = bool(value)
        # date/phone/json accepted as-is; DB stores jsonb

        # Upsert into custom_values
        upsert_sql = """
        insert into custom_values (org_id, entity, entity_id, property_id, value, created_at)
        values (%s, 'people', %s, %s, %s::jsonb, now())
        on conflict (org_id, entity, entity_id, property_id)
        do update set value = excluded.value
        returning property_id
        """
        # Always encode as JSON text to satisfy ::jsonb cast
        import json as _json
        val_json = _json.dumps(value)
        upsert_rows = await fetch(upsert_sql, org_id, person_id, prop["id"], val_json)

        return {
            "name": prop["name"],
            "label": prop.get("label"),
            "data_type": dt,
            "value": value,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property update failed: {e}")

@router.patch("/{person_id}/lead")
async def update_lead(person_id: str, update: LeadUpdate):
    """
    Update lead-specific information for a person.
    """
    try:
        logger.info("PATCH /people/%s/lead payload=%s", person_id, update.dict(exclude_unset=True))
        # First check if this person is actually a lead
        person_check = await fetch(
            "SELECT lifecycle_state FROM people WHERE id::text = %s",
            person_id
        )
        
        if not person_check:
            raise HTTPException(status_code=404, detail="Person not found")
            
        if person_check[0]["lifecycle_state"] != "enquiry":
            raise HTTPException(status_code=400, detail="Person is not in enquiry stage")
        
        # Build dynamic update query for lead fields
        update_fields = []
        params = []
        
        if update.lead_score is not None:
            update_fields.append(f"lead_score = %s")
            params.append(update.lead_score)
            
        if update.conversion_probability is not None:
            update_fields.append(f"conversion_probability = %s")
            params.append(update.conversion_probability)
            
        if update.assigned_to is not None:
            update_fields.append(f"assigned_to = %s")
            params.append(update.assigned_to)
            
        if update.status is not None:
            update_fields.append(f"status = %s")
            params.append(update.status)
            
        if update.next_follow_up is not None:
            update_fields.append(f"next_follow_up = %s")
            params.append(update.next_follow_up)
        
        if not update_fields:
            raise HTTPException(status_code=422, detail="No lead fields to update")
        
        # Add updated_at timestamp
        update_fields.append("updated_at = NOW()")
        
        sql = f"""
            UPDATE people 
            SET {', '.join(update_fields)}
            WHERE id::text = %s
            RETURNING id::text, lead_score, conversion_probability, assigned_to, status, next_follow_up, updated_at
        """
        params.append(person_id)

        rows = await fetch(sql, *params)
        
        # If notes were provided, add them to a separate notes table
        if update.notes:
            await execute("""
                INSERT INTO lead_notes (person_id, note, note_type, created_by, created_at)
                VALUES (%s, %s, %s, %s, NOW())
            """, person_id, update.notes, "general", update.assigned_to or "system")
        
        logger.info("PATCH /people/%s/lead success fields=%s", person_id, ', '.join([f.split('=')[0].strip() for f in update_fields]))
        return {
            "message": "Lead updated successfully",
            "lead": rows[0] if rows else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lead update failed: {e}")

@router.post("/{person_id}/lead/notes")
async def add_lead_note(person_id: str, note: LeadNote):
    """
    Add a note to a lead's record.
    """
    try:
        # Check if person exists and is a lead
        person_check = await fetch(
            "SELECT lifecycle_state FROM people WHERE id::text = %s",
            person_id
        )
        
        if not person_check:
            raise HTTPException(status_code=404, detail="Person not found")
            
        if person_check[0]["lifecycle_state"] != "enquiry":
            raise HTTPException(status_code=400, detail="Person is not in enquiry stage")
        
        # Insert the note
        result = await execute("""
            INSERT INTO lead_notes (person_id, note, note_type, created_by, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            RETURNING id, note, note_type, created_by, created_at
        """, person_id, note.note, note.note_type, note.created_by or "system")
        
        return {
            "message": "Note added successfully",
            "note": result[0] if result else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add note: {e}")

@router.get("/{person_id}/lead/notes")
async def get_lead_notes(person_id: str):
    """
    Get all notes for a lead.
    """
    try:
        # Check if person exists and is a lead
        person_check = await fetch(
            "SELECT lifecycle_state FROM people WHERE id::text = %s",
            person_id
        )
        
        if not person_check:
            raise HTTPException(status_code=404, detail="Person not found")
            
        if person_check[0]["lifecycle_state"] != "enquiry":
            raise HTTPException(status_code=400, detail="Person is not in enquiry stage")
        
        # Get the notes
        notes = await fetch("""
            SELECT id, note, note_type, created_by, created_at
            FROM lead_notes 
            WHERE person_id = %s
            ORDER BY created_at DESC
        """, person_id)
        
        return {"notes": notes}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notes: {e}")

@router.get("/{person_id}/properties/progressive")
async def get_person_progressive_properties(person_id: str):
    """
    Get properties for a person based on their current lifecycle stage.
    This enables progressive disclosure - properties only appear when relevant.
    """
    try:
        # First get the person's current lifecycle stage
        person_sql = """
            SELECT id, lifecycle_state, org_id 
            FROM people 
            WHERE id::text = %s
        """
        person = await fetch(person_sql, person_id)
        
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")
        
        person_data = person[0]
        current_stage = person_data["lifecycle_state"]
        org_id = person_data["org_id"]
        
        # Map lifecycle stages to progressive disclosure stages
        stage_mapping = {
            "enquiry": "lead",
            "pre_applicant": "lead", 
            "applicant": "applicant",
            "enrolled": "enrolled",
            "student": "enrolled",
            "alumni": "alumni"
        }
        
        progressive_stage = stage_mapping.get(current_stage, "lead")
        
        # Get properties visible at this stage
        properties_sql = """
            SELECT 
                cp.id,
                cp.name,
                cp.label,
                cp.data_type,
                cp.group_key,
                cp.lifecycle_stages,
                cp.display_order,
                cp.is_required_at_stage,
                cp.is_system_managed,
                cp.data_source,
                cp.options,
                cp.validation_rules,
                cp.default_value,
                cp.is_ai_enhanced,
                -- Get current value if it exists
                cv.value as current_value,
                cv.created_at as value_created_at
            FROM custom_properties cp
            LEFT JOIN custom_values cv ON cv.property_id = cp.id 
                AND cv.entity_id = %s 
                AND cv.entity = 'people'
            WHERE cp.org_id = %s 
              AND cp.entity = 'people'
              AND cp.lifecycle_stages @> %s::text[]
            ORDER BY cp.group_key, cp.display_order
        """
        
        properties = await fetch(properties_sql, person_id, org_id, [progressive_stage])
        
        # Group properties by their group
        grouped_properties = {}
        for prop in properties:
            group_key = prop["group_key"] or "other"
            if group_key not in grouped_properties:
                grouped_properties[group_key] = []
            grouped_properties[group_key].append(prop)
        
        return {
            "person_id": person_id,
            "current_lifecycle_stage": current_stage,
            "progressive_stage": progressive_stage,
            "properties": grouped_properties,
            "total_properties": len(properties),
            "groups": list(grouped_properties.keys())
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch progressive properties: {str(e)}")

@router.get("/{person_id}", response_model=dict)
async def get_person(person_id: str):
    """
    Returns a single person's basic record.
    """
    sql = """
      select id, first_name, last_name, email, phone, lifecycle_state, 
             lead_score, conversion_probability, created_at, updated_at
      from people
      where id::text = %s
      limit 1
    """
    try:
        rows = await fetch(sql, person_id)
        if not rows:
            raise HTTPException(status_code=404, detail="Person not found")
        return rows[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"/people/{{person_id}} DB error: {e}")