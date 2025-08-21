-- Add priority and urgency to applications

alter table applications add column if not exists priority text check (priority in ('critical','high','medium','low')) default 'medium';
alter table applications add column if not exists urgency text check (urgency in ('high','medium','low')) default 'medium';

-- Add urgency_reason for context
alter table applications add column if not exists urgency_reason text;

-- Index for filtering
create index if not exists idx_app_priority on applications(org_id, priority);
create index if not exists idx_app_urgency on applications(org_id, urgency);
