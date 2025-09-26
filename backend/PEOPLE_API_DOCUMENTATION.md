# People API Documentation

## Overview
This document explains how the FastAPI functions work in `app/routers/people.py` and the critical database transaction handling that was discovered during debugging.

## Critical Database Transaction Issue (FIXED)

### The Problem
The original implementation was using `fetch()` for UPDATE queries, which **does not commit transactions**. This caused database updates to be rolled back after the API returned, making it appear that updates were successful when they weren't actually persisted.

### The Solution
- **Use `execute()` for UPDATE/INSERT/DELETE queries** (commits transactions)
- **Use `fetch()` for SELECT queries** (read-only)
- **Separate UPDATE and SELECT operations** instead of using RETURNING clauses

### Code Pattern
```python
# ❌ WRONG - This doesn't commit!
rows = await fetch("UPDATE people SET field = %s RETURNING *", value)

# ✅ CORRECT - This commits the transaction
await execute("UPDATE people SET field = %s", value)
rows = await fetch("SELECT * FROM people WHERE id = %s", person_id)
```

## API Endpoints

### 1. GET /people
**Purpose**: List all people with pagination and filtering
**Function**: `list_people()`
**Database**: Uses `fetch()` (read-only) ✅

### 2. GET /people/enriched
**Purpose**: List people with enriched data from materialized view
**Function**: `list_people_enriched()`
**Database**: Uses `fetch()` (read-only) ✅
**Note**: Uses `vw_people_enriched` materialized view

### 3. GET /people/{person_id}/enriched
**Purpose**: Get single person with enriched data
**Function**: `get_person_enriched(person_id)`
**Database**: Uses `fetch()` (read-only) ✅
**Critical Feature**: Overrides materialized view data with live data from `people` table

#### Live Data Override
The `/enriched` endpoint uses a materialized view (`vw_people_enriched`) which can be stale. To ensure data consistency, it overrides specific fields with live data:

```python
# Fields that are overridden with live data:
live_fields = [
    "first_name", "last_name", "email", "phone",
    "date_of_birth", "nationality",  # ← Added during debugging
    "lifecycle_state", "lead_score", "conversion_probability", "updated_at"
]
```

### 4. PATCH /people/{person_id}
**Purpose**: Update person's basic information
**Function**: `update_person(person_id, update: PersonUpdate)`
**Database**: Uses `execute()` + `fetch()` (FIXED) ✅

#### Supported Fields
```python
class PersonUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None      # ← Added during debugging
    nationality: Optional[str] = None         # ← Added during debugging
    programme: Optional[str] = None
    lifecycle_state: Optional[str] = None
```

#### Implementation Pattern
```python
# 1. Build dynamic UPDATE query
update_fields = []
params = []
if update.first_name is not None:
    update_fields.append("first_name = %s")
    params.append(update.first_name)

# 2. Execute UPDATE (commits transaction)
await execute(f"UPDATE people SET {', '.join(update_fields)} WHERE id::text = %s", *params, person_id)

# 3. Fetch updated row
rows = await fetch("SELECT ... FROM people WHERE id::text = %s", person_id)
```

### 5. PATCH /people/{person_id}/properties
**Purpose**: Update custom properties for a person
**Function**: `upsert_person_property(person_id, body: PropertyUpdate)`
**Database**: Uses `execute()` (commits transactions) ✅

### 6. PATCH /people/{person_id}/lead
**Purpose**: Update lead-specific information
**Function**: `update_lead(person_id, update: LeadUpdate)`
**Database**: Uses `execute()` (commits transactions) ✅

## Database Functions

### fetch(sql, *args)
- **Purpose**: Execute SELECT queries
- **Transaction**: Read-only, no commit
- **Returns**: List of dictionaries
- **Usage**: `rows = await fetch("SELECT * FROM people WHERE id = %s", person_id)`

### execute(sql, *args)
- **Purpose**: Execute INSERT/UPDATE/DELETE queries
- **Transaction**: Commits automatically
- **Returns**: None
- **Usage**: `await execute("UPDATE people SET field = %s WHERE id = %s", value, person_id)`

## Debugging Features

### Logging
All endpoints include comprehensive logging:
```python
logger.info("PATCH /people/%s payload=%s", person_id, update.dict(exclude_unset=True))
logger.info("🔧 DEBUG: Executing SQL: %s", sql)
logger.info("🔧 DEBUG: With params: %s", params)
logger.info("🔧 DEBUG: Database returned: %s", rows[0])
```

### Verification Queries
The `update_person` function includes verification queries to ensure updates persist:
```python
# Verify the update by querying the database again
verify_sql = "SELECT id, first_name, last_name, date_of_birth, phone, updated_at FROM people WHERE id::text = %s"
verify_rows = await fetch(verify_sql, person_id)
logger.info(f"🔧 DEBUG: Verification query returned: {verify_rows[0]}")
```

## Common Issues and Solutions

### Issue: Updates appear successful but don't persist
**Cause**: Using `fetch()` for UPDATE queries
**Solution**: Use `execute()` for UPDATE queries

### Issue: Materialized view shows stale data
**Cause**: Materialized view not refreshed
**Solution**: Override with live data in `/enriched` endpoint

### Issue: Field not supported in API
**Cause**: Field not in `PersonUpdate` model or update logic
**Solution**: Add field to model and update logic

## Testing

### Manual Testing
1. Update a person field via API
2. Check backend logs for "Database returned" message
3. Verify the field in Supabase dashboard
4. Check that `/enriched` endpoint returns updated value

### Debug Logs to Watch
```
🔧 DEBUG: Executing SQL: UPDATE people SET field = %s WHERE id::text = %s
🔧 DEBUG: With params: [value, person_id]
🔧 DEBUG: Database returned: {'field': 'updated_value', ...}
🔧 DEBUG: Verification query returned: {'field': 'updated_value', ...}
```

## File Locations
- **Main API**: `backend/app/routers/people.py`
- **Database Functions**: `backend/app/db/db.py` and `backend/app/db/database.py`
- **Schemas**: `backend/app/schemas/people.py`
- **Frontend API**: `frontend/src/services/api.ts`

## Last Updated
September 23, 2025 - Fixed critical transaction issue with UPDATE queries
