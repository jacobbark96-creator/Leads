-- Add fields for Welcome Modal state and Advisor Details
alter table public.clients add column if not exists has_seen_welcome_modal boolean default false;
alter table public.users add column if not exists job_title text;
alter table public.users add column if not exists about text;
alter table public.users add column if not exists working_hours text;
