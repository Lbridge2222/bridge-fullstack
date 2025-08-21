-- Programmes details and delivery modes

alter table programmes add column if not exists duration_months int;
alter table programmes add column if not exists fees_uk_home numeric(10,2);
alter table programmes add column if not exists fees_international numeric(10,2);
alter table programmes add column if not exists entry_requirements jsonb;
alter table programmes add column if not exists mode_delivery text[];


