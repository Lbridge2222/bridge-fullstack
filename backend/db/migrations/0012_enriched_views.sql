-- Enhanced views for frontend support

-- Update vw_board_applications with additional fields
drop materialized view if exists vw_board_applications;
create materialized view vw_board_applications as
select
  a.id as application_id,
  a.stage,
  a.status,
  a.source,
  a.sub_source,
  a.assignee_user_id,
  a.created_at,
  a.priority,
  a.urgency,
  a.urgency_reason,
  p.id as person_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.lead_score,
  p.conversion_probability,
  pr.name as programme_name,
  pr.code as programme_code,
  c.name as campus_name,
  i.cycle_label,
  extract(epoch from (now() - a.created_at))/86400 as days_in_pipeline,
  (now() - a.created_at > interval '7 days') as sla_overdue,
  exists (select 1 from offers o where o.application_id = a.id and o.status='issued') as has_offer,
  exists (select 1 from interviews iv where iv.application_id = a.id and (iv.outcome is null or iv.outcome='pending')) as has_active_interview,
  -- Latest activity timestamp
  (select max(act.created_at) from activities act where act.application_id = a.id) as last_activity_at,
  -- Offer type if exists
  (select o.type from offers o where o.application_id = a.id and o.status='issued' order by o.issued_at desc limit 1) as offer_type
from applications a
join people p on p.id = a.person_id
join programmes pr on pr.id = a.programme_id
left join campuses c on c.id = pr.campus_id
join intakes i on i.id = a.intake_id
with no data;

-- Create unique index
create unique index if not exists mv_board_applications_pk on vw_board_applications(application_id);

-- Create enriched people view for leads management
create materialized view if not exists vw_people_enriched as
select
  p.id,
  p.org_id,
  p.external_ref,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.phone_country_code,
  p.phone_number,
  p.phone_extension,
  p.preferred_contact_method,
  p.date_of_birth,
  p.nationality,
  p.address_line1,
  p.address_line2,
  p.city,
  p.postcode,
  p.country,
  p.lifecycle_state,
  p.created_at,
  p.updated_at,
  p.touchpoint_count,
  p.last_engagement_date,
  p.lead_score,
  p.engagement_score,
  p.conversion_probability,
  -- Latest application info
  latest_app.stage as latest_application_stage,
  latest_app.source as latest_application_source,
  latest_app.created_at as latest_application_date,
  latest_app.priority as latest_application_priority,
  latest_app.urgency as latest_application_urgency,
  -- Programme and campus from latest application
  latest_prog.name as latest_programme_name,
  latest_prog.code as latest_programme_code,
  latest_campus.name as latest_campus_name,
  latest_intake.cycle_label as latest_academic_year,
  -- Latest activity
  latest_activity.created_at as last_activity_at,
  latest_activity.title as last_activity_title,
  latest_activity.kind as last_activity_kind
from people p
-- Latest application (if any)
left join lateral (
  select a.*, pr.id as prg_id, pr.name as prg_name, pr.code as prg_code,
         c.id as campus_id, c.name as campus_name, i.cycle_label
  from applications a
  join programmes pr on pr.id = a.programme_id
  left join campuses c on c.id = pr.campus_id
  join intakes i on i.id = a.intake_id
  where a.person_id = p.id
  order by a.created_at desc
  limit 1
) latest_app on true
left join programmes latest_prog on latest_prog.id = latest_app.prg_id
left join campuses latest_campus on latest_campus.id = latest_app.campus_id
left join intakes latest_intake on latest_intake.id = latest_app.intake_id
-- Latest activity (if any)
left join lateral (
  select act.*
  from activities act
  where act.person_id = p.id
  order by act.created_at desc
  limit 1
) latest_activity on true
with no data;

-- Create unique index
create unique index if not exists mv_people_enriched_pk on vw_people_enriched(id);
