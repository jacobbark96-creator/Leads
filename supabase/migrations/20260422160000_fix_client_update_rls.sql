drop policy if exists "Clients can read own profile" on public.clients;
drop policy if exists "Clients can update own profile" on public.clients;

create policy "Clients can read own profile" on public.clients
  for select using (auth.uid() = user_id);

create policy "Clients can update own profile" on public.clients
  for update using (auth.uid() = user_id);
