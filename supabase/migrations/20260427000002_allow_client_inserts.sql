-- Add INSERT policies for clients and contractors to allow self-onboarding

-- Policy for clients to insert their own profile
create policy "Clients can insert own profile" on public.clients
  for insert with check (auth.uid() = user_id);

-- Policy for clients to insert their own contractor record
create policy "Clients can insert own contractor profile" on public.contractors
  for insert with check (client_id in (select id from public.clients where user_id = auth.uid()));
