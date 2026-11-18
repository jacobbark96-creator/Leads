alter table public.users add column if not exists has_residential_access boolean default false;
update public.users set has_residential_access = true;
