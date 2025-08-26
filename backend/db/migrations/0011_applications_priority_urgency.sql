-- Add priority and urgency to applications

alter table applications add column if not exists priority text check (priority in ('critical','high','medium','low')) default 'medium';
alter table applications add column if not exists urgency text check (urgency in ('high','medium','low')) default 'medium';

-- Add urgency_reason for context
alter table applications add column if not exists urgency_reason text;

-- Index for filtering
create index if not exists idx_app_priority on applications(org_id, priority);
create index if not exists idx_app_urgency on applications(org_id, urgency);

-- Ensure custom_values has a natural unique key for upserts (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'custom_values'
      AND constraint_name = 'custom_values_unique_key'
  ) THEN
    ALTER TABLE custom_values
      ADD CONSTRAINT custom_values_unique_key
      UNIQUE(org_id, entity, entity_id, property_id);
  END IF;
END$$;
