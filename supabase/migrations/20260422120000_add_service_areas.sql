-- Add service_areas JSONB column to store an array of {address, lat, lng, radius} objects
alter table public.clients add column if not exists service_areas jsonb default '[]'::jsonb;
alter table public.contractors add column if not exists service_areas jsonb default '[]'::jsonb;

-- Also add is_profile_complete flag to easily check if they are allowed into the dashboard
alter table public.clients add column if not exists is_profile_complete boolean default false;
