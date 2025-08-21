create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists orgs(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  name text not null,
  email text not null unique,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists people(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  external_ref text,
  first_name text,
  last_name text,
  email text,
  phone text,
  lifecycle_state text not null default 'lead',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_people_org on people(org_id);
create index if not exists idx_people_state on people(lifecycle_state);
create unique index if not exists people_unique_email_per_org on people(org_id,email) where email is not null;

create table if not exists lifecycle_states(
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  state text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references users(id)
);
create index if not exists idx_lifecycle_person on lifecycle_states(person_id, changed_at desc);

create table if not exists campuses(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  name text not null
);

create table if not exists programmes(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  campus_id uuid references campuses(id),
  code text,
  name text not null,
  level text,
  mode text
);

create table if not exists intakes(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  cycle_label text not null,
  start_date date,
  end_date date
);

create table if not exists applications(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  person_id uuid not null references people(id) on delete cascade,
  programme_id uuid not null references programmes(id),
  intake_id uuid not null references intakes(id),
  status text not null default 'open',
  stage  text not null default 'enquiry',
  source text,
  sub_source text,
  assignee_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_app_stage on applications(org_id, stage);
create index if not exists idx_app_person on applications(person_id);
create index if not exists idx_app_prog on applications(programme_id);
create index if not exists idx_app_intake on applications(intake_id);
create index if not exists idx_app_assignee on applications(assignee_user_id);

create table if not exists pipeline_history(
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  from_stage text,
  to_stage   text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references users(id),
  note text
);
create index if not exists idx_ph_app on pipeline_history(application_id, changed_at desc);

create table if not exists interviews(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  application_id uuid not null references applications(id) on delete cascade,
  scheduled_start timestamptz not null,
  scheduled_end   timestamptz not null,
  mode text,
  location text,
  outcome text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_iv_app on interviews(application_id, scheduled_start desc);

create table if not exists offers(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  application_id uuid not null references applications(id) on delete cascade,
  type text,
  conditions jsonb,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'issued'
);
create index if not exists idx_offer_app on offers(application_id, issued_at desc);

create table if not exists enrolments(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  application_id uuid not null references applications(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  fee_status text,
  funding_route text,
  notes text
);
create index if not exists idx_enrol_app on enrolments(application_id, confirmed_at desc);

create table if not exists activities(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  actor_user_id uuid references users(id),
  person_id uuid references people(id) on delete set null,
  application_id uuid references applications(id) on delete set null,
  kind text not null,
  direction text,
  title text,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_act_org on activities(org_id, created_at desc);
create index if not exists idx_act_person on activities(person_id, created_at desc);
create index if not exists idx_act_app on activities(application_id, created_at desc);
create index if not exists idx_act_kind on activities(kind);

create table if not exists attachments(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  activity_id uuid not null references activities(id) on delete cascade,
  filename text not null,
  storage_key text not null,
  mime text,
  size int
);
create index if not exists idx_att_act on attachments(activity_id);

create table if not exists custom_properties(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  entity text not null,
  name text not null,
  label text not null,
  data_type text not null,
  is_required boolean not null default false,
  is_indexed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(org_id, entity, name)
);

create table if not exists custom_values(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  entity text not null,
  entity_id uuid not null,
  property_id uuid not null references custom_properties(id) on delete cascade,
  value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_cv_entity on custom_values(org_id, entity, entity_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists people_set_updated_at on people;
create trigger people_set_updated_at
before update on people
for each row execute procedure set_updated_at();

drop trigger if exists applications_set_updated_at on applications;
create trigger applications_set_updated_at
before update on applications
for each row execute procedure set_updated_at();