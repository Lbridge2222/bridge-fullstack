-- Fix days_in_pipeline type to integer in board MV

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
  floor(extract(epoch from (now() - a.created_at)) / 86400)::int as days_in_pipeline,
  (now() - a.created_at > interval '7 days') as sla_overdue,
  exists (select 1 from offers o where o.application_id = a.id and o.status='issued') as has_offer,
  exists (select 1 from interviews iv where iv.application_id = a.id and (iv.outcome is null or iv.outcome='pending')) as has_active_interview,
  (select max(act.created_at) from activities act where act.application_id = a.id) as last_activity_at,
  (select o.type from offers o where o.application_id = a.id and o.status='issued' order by o.issued_at desc limit 1) as offer_type
from applications a
join people p on p.id = a.person_id
join programmes pr on pr.id = a.programme_id
left join campuses c on c.id = pr.campus_id
join intakes i on i.id = a.intake_id
with no data;

create unique index if not exists mv_board_applications_pk on vw_board_applications(application_id);

-- Populate the view
refresh materialized view vw_board_applications;
