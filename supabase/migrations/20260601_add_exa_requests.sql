create table if not exists public.exa_requests (
  id uuid default gen_random_uuid() primary key,
  request_id text,
  status text not null default 'pending',
  url text,
  payload jsonb,
  response_data jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- enable RLS
alter table public.exa_requests enable row level security;

-- policies
create policy "Allow all users to select exa_requests" on public.exa_requests
  for select using (true);

create policy "Allow all users to insert exa_requests" on public.exa_requests
  for insert with check (true);

create policy "Allow all users to update exa_requests" on public.exa_requests
  for update using (true);
