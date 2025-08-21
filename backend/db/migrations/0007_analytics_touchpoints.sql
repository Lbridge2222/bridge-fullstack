-- Touchpoints + real-time aggregates

create table if not exists touchpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  person_id uuid references people(id) on delete set null,
  application_id uuid references applications(id) on delete set null,
  activity_id uuid references activities(id) on delete set null,

  touchpoint_type text not null,
  touchpoint_source text not null,
  touchpoint_medium text,
  touchpoint_campaign text,
  content_id text,
  content_title text,
  content_variant text,
  engagement_duration int,
  engagement_depth int,
  conversion_action text,
  user_agent text,
  ip_address inet,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,

  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_touchpoints_person on touchpoints(person_id, created_at desc);
create index if not exists idx_touchpoints_application on touchpoints(application_id, created_at desc);
create index if not exists idx_touchpoints_type on touchpoints(touchpoint_type, created_at desc);
create index if not exists idx_touchpoints_campaign on touchpoints(utm_campaign, created_at desc);

alter table people add column if not exists touchpoint_count int default 0;
alter table people add column if not exists last_engagement_date timestamptz;
alter table people add column if not exists lead_score int default 0;
alter table people add column if not exists engagement_score int default 0;
alter table people add column if not exists conversion_probability decimal(3,2);

alter table applications add column if not exists touchpoint_count int default 0;
alter table applications add column if not exists time_to_decision int;
alter table applications add column if not exists decision_factors jsonb;
alter table applications add column if not exists attribution_path jsonb;

create or replace function on_touchpoint_insert() returns trigger as $$
begin
  if new.person_id is not null then
    update people
      set touchpoint_count = coalesce(touchpoint_count,0) + 1,
          last_engagement_date = greatest(coalesce(last_engagement_date, 'epoch'), new.created_at)
      where id = new.person_id;
  end if;
  if new.application_id is not null then
    update applications
      set touchpoint_count = coalesce(touchpoint_count,0) + 1
      where id = new.application_id;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_touchpoints_insert on touchpoints;
create trigger trg_touchpoints_insert
after insert on touchpoints
for each row execute function on_touchpoint_insert();


