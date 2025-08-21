-- Consents and data retention

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  person_id uuid not null references people(id) on delete cascade,
  purpose text not null,
  lawful_basis text not null,
  status text not null,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  expires_at timestamptz,
  source text,
  meta jsonb,
  created_at timestamptz not null default now(),
  unique(org_id, person_id, purpose)
);

create table if not exists consent_events (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null references consents(id) on delete cascade,
  event text not null,
  at timestamptz not null default now(),
  actor_user_id uuid references users(id),
  meta jsonb
);

create table if not exists data_retention_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  entity text not null,
  keep_for_interval interval not null,
  hard_delete boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, entity)
);

alter table touchpoints add column if not exists expires_at timestamptz;

create or replace function purge_expired_touchpoints() returns void as $$
begin
  delete from touchpoints where expires_at is not null and expires_at < now();
end; $$ language plpgsql;


