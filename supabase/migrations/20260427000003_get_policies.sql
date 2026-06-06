create or replace function get_all_policies()
returns table (
  schemaname name,
  tablename name,
  policyname name,
  permissive text,
  roles name[],
  cmd text,
  qual text,
  with_check text
) as $$
begin
  return query select p.schemaname, p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check
  from pg_policies p where p.tablename in ('clients', 'contractors');
end;
$$ language plpgsql security definer;
