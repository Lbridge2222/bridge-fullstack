-- Migration: Fix Lifecycle Constraint before seeds
-- Purpose: Allow 'lead' lifecycle state and set default accordingly

-- 1) Drop existing CHECK constraint if present (idempotent)
alter table people drop constraint if exists people_lifecycle_check;

-- 2) Recreate CHECK constraint with updated allowed values
alter table people add constraint people_lifecycle_check
  check (lifecycle_state in ('lead','applicant','enrolled','student','alumni'));

-- 3) Ensure default is 'lead'
alter table people alter column lifecycle_state drop default;
alter table people alter column lifecycle_state set default 'lead';

-- 4) Normalize any unexpected values pre-seed (safe no-op if none)
update people set lifecycle_state = 'lead'
where lifecycle_state not in ('lead','applicant','enrolled','student','alumni');
