from fastapi import APIRouter, Body, HTTPException, Query
from typing import Optional
from app.db.db import execute

router = APIRouter()

@router.post("/touchpoint", status_code=204)
async def create_touchpoint(payload: dict = Body(...)):
    try:
        await execute(
            """
            insert into touchpoints (
              org_id, person_id, application_id, activity_id,
              touchpoint_type, touchpoint_source, touchpoint_medium, touchpoint_campaign,
              content_id, content_title, content_variant,
              engagement_duration, engagement_depth, conversion_action,
              user_agent, ip_address, referrer,
              utm_source, utm_medium, utm_campaign, utm_term, utm_content,
              created_at, expires_at
            ) values (
              %s,%s,%s,%s,
              %s,%s,%s,%s,
              %s,%s,%s,
              %s,%s,%s,
              %s,%s,%s,
              %s,%s,%s,%s,%s,
              coalesce(%s, now()), %s
            )
            """,
            payload.get("org_id"), payload.get("person_id"), payload.get("application_id"), payload.get("activity_id"),
            payload.get("touchpoint_type"), payload.get("touchpoint_source"), payload.get("touchpoint_medium"), payload.get("touchpoint_campaign"),
            payload.get("content_id"), payload.get("content_title"), payload.get("content_variant"),
            payload.get("engagement_duration"), payload.get("engagement_depth"), payload.get("conversion_action"),
            payload.get("user_agent"), payload.get("ip_address"), payload.get("referrer"),
            payload.get("utm_source"), payload.get("utm_medium"), payload.get("utm_campaign"), payload.get("utm_term"), payload.get("utm_content"),
            payload.get("created_at"), payload.get("expires_at"),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"touchpoint insert failed: {e}")
    return None

