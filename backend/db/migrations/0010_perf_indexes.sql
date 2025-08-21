-- Performance indexes

create index if not exists idx_app_org_stage_created on applications(org_id, stage, created_at desc);
create index if not exists idx_ph_app_changed on pipeline_history(application_id, changed_at desc);

-- Optional fuzzy search support (enable when desired)
-- create extension if not exists pg_trgm;
-- create index if not exists people_email_trgm on people using gin (email gin_trgm_ops);


