-- People contact structure enhancements

alter table people add column if not exists date_of_birth date;
alter table people add column if not exists nationality text;
alter table people add column if not exists address_line1 text;
alter table people add column if not exists address_line2 text;
alter table people add column if not exists city text;
alter table people add column if not exists postcode text;
alter table people add column if not exists country text;

alter table people add column if not exists phone_country_code text;
alter table people add column if not exists phone_number text;
alter table people add column if not exists phone_extension text;

alter table people add column if not exists preferred_contact_method text;
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'people' and constraint_name = 'people_preferred_contact_check'
  ) then
    alter table people add constraint people_preferred_contact_check
      check (preferred_contact_method in ('email','phone','sms','post'));
  end if;
end$$;


