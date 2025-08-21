from fastapi import APIRouter, HTTPException, Path, Body
from typing import Literal, Optional
from uuid import UUID
from app.db.db import fetch, execute

router = APIRouter()

@router.put("/people/{person_id}/consents/{purpose}")
async def upsert_consent(
    person_id: UUID = Path(...),
    purpose: Literal["marketing_email","analytics","sms","calls"] = Path(...),
    payload: dict = Body(...)
):
    status = payload.get("status")
    lawful_basis = payload.get("lawful_basis", "consent")
    if status not in {"granted","withdrawn","expired"}:
        raise HTTPException(status_code=422, detail="invalid status")

    # org scoping: for now pick the person's org
    row = await fetch("select org_id from people where id = %s", person_id)
    if not row:
        raise HTTPException(status_code=404, detail="person not found")
    org_id = row[0]["org_id"]

    await execute(
        """
        insert into consents (org_id, person_id, purpose, lawful_basis, status, granted_at, withdrawn_at, expires_at, source, meta)
        values (%s,%s,%s,%s,%s, case when %s='granted' then now() end, case when %s='withdrawn' then now() end, %s, %s, %s)
        on conflict (org_id, person_id, purpose)
        do update set status = excluded.status,
                      lawful_basis = excluded.lawful_basis,
                      granted_at = case when excluded.status='granted' then now() else consents.granted_at end,
                      withdrawn_at = case when excluded.status='withdrawn' then now() else consents.withdrawn_at end,
                      expires_at = excluded.expires_at,
                      source = excluded.source,
                      meta = excluded.meta
        """,
        org_id, person_id, purpose, lawful_basis, status, status, status,
        payload.get("expires_at"), payload.get("source"), payload.get("meta"),
    )

    # log event
    await execute(
        "insert into consent_events (consent_id, event, actor_user_id, meta) select id, %s, %s, %s from consents where org_id=%s and person_id=%s and purpose=%s",
        status, payload.get("actor_user_id"), payload.get("meta"), org_id, person_id, purpose,
    )

    return {"ok": True}

