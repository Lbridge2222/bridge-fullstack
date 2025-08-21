-- Attribution models

create table if not exists attribution_models (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  name text not null,
  weights jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists one_default_attr_model on attribution_models(org_id) where is_default;


