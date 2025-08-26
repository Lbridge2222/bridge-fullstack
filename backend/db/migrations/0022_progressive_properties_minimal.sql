-- Migration: Progressive Properties (Minimal, Non-disruptive)
-- Goal: Enable lifecycle-based progressive disclosure using only existing structures

-- ============================================================================
-- 1) Enhance custom_properties (minimal metadata only)
-- ============================================================================
alter table custom_properties add column if not exists group_key text;                       -- UI grouping
alter table custom_properties add column if not exists lifecycle_stages text[] default '{}'; -- progressive disclosure
alter table custom_properties add column if not exists display_order int default 0;
alter table custom_properties add column if not exists is_required_at_stage boolean default false;
alter table custom_properties add column if not exists conditional_logic jsonb;              -- optional show/hide rules

alter table custom_properties add column if not exists is_system_managed boolean default false;
alter table custom_properties add column if not exists data_source text default 'manual';    -- manual|calculated|etl|ai
alter table custom_properties add column if not exists options jsonb;                        -- for select/multiselect
alter table custom_properties add column if not exists validation_rules jsonb;
alter table custom_properties add column if not exists default_value jsonb;
alter table custom_properties add column if not exists is_ai_enhanced boolean default false;
alter table custom_properties add column if not exists ai_prompt text;

create index if not exists idx_custom_properties_lifecycle on custom_properties using GIN (lifecycle_stages);
create index if not exists idx_custom_properties_system on custom_properties (is_system_managed, entity);
create index if not exists idx_custom_properties_group on custom_properties (group_key, display_order);

-- Helper macro: org to seed
-- NOTE: replace with your live org id if needed; ON CONFLICT guards make this safe either way.
-- Using example org id already present in seeds.
-- Org: '550e8400-e29b-41d4-a716-446655440000'

-- ============================================================================
-- 2) Map EXISTING people columns to properties metadata (no schema change)
--    This allows progressive disclosure control over existing fields.
-- ============================================================================
insert into custom_properties (org_id, entity, name, label, data_type, group_key, lifecycle_stages, display_order, is_system_managed, data_source)
values
-- Personal
('550e8400-e29b-41d4-a716-446655440000','people','first_name','First Name','text','personal','{lead,applicant,enrolled,alumni}',1,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','last_name','Last Name','text','personal','{lead,applicant,enrolled,alumni}',2,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','date_of_birth','Date of Birth','date','personal','{lead,applicant,enrolled,alumni}',3,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','nationality','Nationality','select','personal','{lead,applicant,enrolled,alumni}',4,true,'manual'),
-- Contactability
('550e8400-e29b-41d4-a716-446655440000','people','email','Email Address','email','contactability','{lead,applicant,enrolled,alumni}',1,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','phone','Phone Number','phone','contactability','{lead,applicant,enrolled,alumni}',2,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','preferred_contact_method','Preferred Contact Method','select','contactability','{lead,applicant,enrolled,alumni}',3,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','address_line1','Address Line 1','text','contactability','{lead,applicant,enrolled,alumni}',4,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','address_line2','Address Line 2','text','contactability','{lead,applicant,enrolled,alumni}',5,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','city','City','text','contactability','{lead,applicant,enrolled,alumni}',6,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','postcode','Postcode','text','contactability','{lead,applicant,enrolled,alumni}',7,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','country','Country','select','contactability','{lead,applicant,enrolled,alumni}',8,true,'manual'),
-- Engagement (existing aggregate columns)
('550e8400-e29b-41d4-a716-446655440000','people','touchpoint_count','Touchpoint Count','number','engagement','{lead,applicant,enrolled,alumni}',1,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','last_engagement_date','Last Engagement','datetime','engagement','{lead,applicant,enrolled,alumni}',2,true,'calculated'),
-- Scoring (existing columns; precision varies by migration path, we don't change schema here)
('550e8400-e29b-41d4-a716-446655440000','people','lead_score','Lead Score','number','scoring','{lead,applicant,enrolled,alumni}',1,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','engagement_score','Engagement Score','number','scoring','{lead,applicant,enrolled,alumni}',2,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','conversion_probability','Conversion Probability','decimal','scoring','{lead,applicant,enrolled,alumni}',3,true,'calculated')
on conflict (org_id, entity, name) do nothing;

-- ============================================================================
-- 3) Add ONLY missing system fields as custom properties (no new tables/columns)
--    These will be populated via ETL / app logic using custom_values.
-- ============================================================================
-- Engagement: Website + Email analytics (missing as columns)
insert into custom_properties (org_id, entity, name, label, data_type, group_key, lifecycle_stages, display_order, is_system_managed, data_source)
values
('550e8400-e29b-41d4-a716-446655440000','people','website_pages_viewed','Website Pages Viewed','number','engagement','{lead,applicant,enrolled,alumni}',3,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','website_time_spent','Website Time Spent (min)','number','engagement','{lead,applicant,enrolled,alumni}',4,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','number_of_sessions','Number of Sessions','number','engagement','{lead,applicant,enrolled,alumni}',5,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','first_session','First Session','datetime','engagement','{lead,applicant,enrolled,alumni}',6,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','time_last_session','Last Session','datetime','engagement','{lead,applicant,enrolled,alumni}',7,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','first_page_seen','First Page Seen','text','engagement','{lead,applicant,enrolled,alumni}',8,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','marketing_emails_opened','Marketing Emails Opened','number','engagement','{lead,applicant,enrolled,alumni}',9,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','marketing_emails_clicked','Marketing Emails Clicked','number','engagement','{lead,applicant,enrolled,alumni}',10,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','marketing_emails_bounced','Marketing Emails Bounced','number','engagement','{lead,applicant,enrolled,alumni}',11,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','first_marketing_email_open_date','First Email Open','datetime','engagement','{lead,applicant,enrolled,alumni}',12,true,'calculated'),
('550e8400-e29b-41d4-a716-446655440000','people','last_marketing_email_click_date','Last Email Click','datetime','engagement','{lead,applicant,enrolled,alumni}',13,true,'calculated')
on conflict (org_id, entity, name) do nothing;

-- UCAS essentials (applicant+)
insert into custom_properties (org_id, entity, name, label, data_type, group_key, lifecycle_stages, display_order, is_system_managed, data_source)
values
('550e8400-e29b-41d4-a716-446655440000','people','ucas_personal_id','UCAS Personal ID','text','ucas','{applicant,enrolled,alumni}',1,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','ucas_application_number','UCAS Application Number','text','ucas','{applicant,enrolled,alumni}',2,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','ucas_track_status','UCAS Track Status','select','ucas','{applicant,enrolled,alumni}',3,true,'manual')
on conflict (org_id, entity, name) do nothing;

-- Academic (applicant+)
insert into custom_properties (org_id, entity, name, label, data_type, group_key, lifecycle_stages, display_order, is_system_managed, data_source)
values
('550e8400-e29b-41d4-a716-446655440000','people','course_preference','Course Preference','select','academic','{applicant,enrolled,alumni}',1,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','campus_preference','Campus Preference','select','academic','{applicant,enrolled,alumni}',2,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','portfolio_provided','Portfolio Provided','boolean','academic','{applicant,enrolled,alumni}',3,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','music_links','Music Links','multi-text','academic','{applicant,enrolled,alumni}',4,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','primary_discipline','Primary Discipline','select','academic','{applicant,enrolled,alumni}',5,true,'manual')
on conflict (org_id, entity, name) do nothing;

-- Attribution (lead+)
insert into custom_properties (org_id, entity, name, label, data_type, group_key, lifecycle_stages, display_order, is_system_managed, data_source)
values
('550e8400-e29b-41d4-a716-446655440000','people','source_of_enquiry','Source of Enquiry','select','attribution','{lead,applicant,enrolled,alumni}',1,true,'manual'),
('550e8400-e29b-41d4-a716-446655440000','people','hs_analytics_source','Analytics Source','text','attribution','{lead,applicant,enrolled,alumni}',2,true,'etl'),
('550e8400-e29b-41d4-a716-446655440000','people','hs_latest_source','Latest Source','text','attribution','{lead,applicant,enrolled,alumni}',3,true,'etl'),
('550e8400-e29b-41d4-a716-446655440000','people','hs_latest_source_timestamp','Latest Source Timestamp','datetime','attribution','{lead,applicant,enrolled,alumni}',4,true,'etl')
on conflict (org_id, entity, name) do nothing;

-- AI insights (lead+)
insert into custom_properties (org_id, entity, name, label, data_type, group_key, lifecycle_stages, display_order, is_system_managed, data_source, is_ai_enhanced)
values
('550e8400-e29b-41d4-a716-446655440000','people','next_best_action','Next Best Action','text','ai_insights','{lead,applicant,enrolled,alumni}',1,true,'ai',true),
('550e8400-e29b-41d4-a716-446655440000','people','next_best_action_confidence','Action Confidence','decimal','ai_insights','{lead,applicant,enrolled,alumni}',2,true,'ai',true)
on conflict (org_id, entity, name) do nothing;

-- ============================================================================
-- 4) Optional: simple verification queries
-- ============================================================================
-- select group_key, count(*) from custom_properties where org_id='550e8400-e29b-41d4-a716-446655440000' and is_system_managed group by 1 order by 1;
