-- Lifecycle State and Application Stage Alignment
-- This migration clarifies the relationship between people.lifecycle_state and applications.stage
-- lifecycle_state drives where people appear in the system
-- applications.stage tracks the specific application progress

-- Add comments to clarify the purpose of each field
comment on column people.lifecycle_state is 'Primary system state: enquiry (leads), pre_applicant (admissions), applicant (applications), enrolled (enrollment), student (active), alumni (graduated)';
comment on column applications.stage is 'Application-specific stage: enquiry, applicant, interview, offer, enrolled - tracks progress through the application process';

-- Create a function to automatically update lifecycle_state based on application stage changes
create or replace function update_lifecycle_from_application()
returns trigger as $$
begin
  -- Only update if this is a stage change
  if old.stage != new.stage then
    -- Update the person's lifecycle_state based on the application stage
    update people set lifecycle_state = case
      when new.stage = 'enquiry' then 'enquiry'
      when new.stage = 'applicant' then 'pre_applicant'
      when new.stage = 'interview' then 'pre_applicant'
      when new.stage = 'offer' then 'applicant'
      when new.stage = 'enrolled' then 'enrolled'
      else people.lifecycle_state  -- Don't change if stage doesn't map
    end
    where id = new.person_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update lifecycle_state when application stage changes
drop trigger if exists trg_applications_stage_lifecycle on applications;
create trigger trg_applications_stage_lifecycle
  after update of stage on applications
  for each row execute function update_lifecycle_from_application();

-- Create a function to get people by system area
-- Drop existing function first to allow return type change (with CASCADE to drop dependent views)
drop function if exists get_people_by_system_area(text) cascade;

create function get_people_by_system_area(area text)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  lifecycle_state text,
  latest_application_stage text,
  lead_score int,
  conversion_probability decimal(3,2),
  created_at timestamptz
) as $$
begin
  return query
  select 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.lifecycle_state,
    latest_app.stage as latest_application_stage,
    p.lead_score,
    p.conversion_probability,
    p.created_at
  from people p
  left join lateral (
    select stage from applications a
    where a.person_id = p.id 
    order by a.created_at desc 
    limit 1
  ) latest_app on true
  where case area
    when 'leads' then p.lifecycle_state in ('enquiry')
    when 'admissions' then p.lifecycle_state in ('pre_applicant', 'applicant')
    when 'enrollment' then p.lifecycle_state in ('enrolled')
    when 'student_records' then p.lifecycle_state in ('student', 'enrolled')
    when 'alumni' then p.lifecycle_state in ('alumni')
    else false
  end
  order by p.created_at desc;
end;
$$ language plpgsql;

-- Create a view for each system area
create or replace view vw_leads_management as
select * from get_people_by_system_area('leads');

create or replace view vw_admissions_management as
select * from get_people_by_system_area('admissions');

create or replace view vw_enrollment_management as
select * from get_people_by_system_area('enrollment');

create or replace view vw_student_records as
select * from get_people_by_system_area('student_records');

create or replace view vw_alumni_management as
select * from get_people_by_system_area('alumni');



-- Add a function to manually promote someone through lifecycle states
create or replace function promote_lifecycle_state(
  person_uuid uuid,
  new_state text,
  reason text default null
)
returns text as $$
declare
  old_state text;
  valid_states text[] := array['enquiry', 'pre_applicant', 'applicant', 'enrolled', 'student', 'alumni'];
begin
  -- Validate the new state
  if new_state != all(valid_states) then
    raise exception 'Invalid lifecycle state: %. Valid states are: %', new_state, array_to_string(valid_states, ', ');
  end if;
  
  -- Get current state
  select lifecycle_state into old_state from people where id = person_uuid;
  if not found then
    raise exception 'Person not found: %', person_uuid;
  end if;
  
  -- Update the state
  update people set lifecycle_state = new_state where id = person_uuid;
  
  -- Log the change
  insert into activities (org_id, person_id, kind, title, body, created_at)
  select 
    org_id,
    id,
    'lifecycle_change',
    'Lifecycle state changed',
    format('Changed from %s to %s. Reason: %s', old_state, new_state, coalesce(reason, 'No reason provided')),
    now()
  from people where id = person_uuid;
  
  return format('Successfully changed %s from %s to %s', person_uuid, old_state, new_state);
end;
$$ language plpgsql;

-- Add comments explaining the system architecture
comment on function get_people_by_system_area(text) is 'Get people filtered by system area: leads, admissions, enrollment, student_records, alumni';
comment on function promote_lifecycle_state(uuid, text, text) is 'Manually promote a person through lifecycle states with audit trail';
comment on view vw_leads_management is 'People in enquiry stage - appear in leads management';
comment on view vw_admissions_management is 'People in pre_applicant or applicant stage - appear in admissions';
comment on view vw_enrollment_management is 'People in enrolled stage - appear in enrollment management';
comment on view vw_student_records is 'People in student or enrolled stage - appear in student records';
comment on view vw_alumni_management is 'People in alumni stage - appear in alumni management';
