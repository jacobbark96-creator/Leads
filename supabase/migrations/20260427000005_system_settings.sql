create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.system_settings enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.system_settings
  for select using (true);

create policy "Enable insert/update for admins" on public.system_settings
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
