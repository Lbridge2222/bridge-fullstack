-- Lock down people.lifecycle_state to HE-specific lifecycle values
-- Allowed: lead | applicant | enrolled | student | alumni

-- Normalize existing values
update people set lifecycle_state = 'lead' where lifecycle_state in ('lead', 'enquiry', 'qualified') or lifecycle_state is null;
update people set lifecycle_state = 'lead' where lifecycle_state in ('pre_applicant');
-- leave 'applicant' and 'enrolled' as-is

-- Anything unexpected -> default to 'lead'
update people set lifecycle_state = 'lead'
where lifecycle_state not in ('lead','applicant','enrolled','student','alumni');

-- Adjust default
alter table people alter column lifecycle_state drop default;
alter table people alter column lifecycle_state set default 'lead';

-- Add CHECK constraint (idempotent pattern)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'people' and constraint_name = 'people_lifecycle_check'
  ) then
    alter table people add constraint people_lifecycle_check
      check (lifecycle_state in ('lead','applicant','enrolled','student','alumni'));
  end if;
end$$;

-- Helpful index for filtering
create index if not exists idx_people_state on people(lifecycle_state);


