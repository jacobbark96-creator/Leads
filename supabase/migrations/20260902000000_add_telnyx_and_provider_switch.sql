-- Add telnyx_number to users
alter table public.users add column if not exists telnyx_number varchar(20);

-- Ensure system_settings table exists (should be already there from 20260427000005_system_settings.sql)
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default now()
);

-- Insert default communication provider if not exists
insert into public.system_settings (key, value)
values ('communication_provider', 'twilio')
on conflict (key) do nothing;
