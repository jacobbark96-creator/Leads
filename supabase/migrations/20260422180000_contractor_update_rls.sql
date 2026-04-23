create policy "Clients can update own contractor profile" on public.contractors
  for update using (client_id in (select id from public.clients where user_id = auth.uid()));