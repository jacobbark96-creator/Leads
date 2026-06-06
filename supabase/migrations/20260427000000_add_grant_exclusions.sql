create table if not exists public.grant_exclusions (
  id uuid default gen_random_uuid() primary key,
  keyword text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.grant_exclusions enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.grant_exclusions
  for select using (true);

create policy "Enable insert for authenticated users" on public.grant_exclusions
  for insert with check (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on public.grant_exclusions
  for delete using (auth.role() = 'authenticated');
