create or replace function get_client_policies()
returns json
language sql
security definer
as $$
  select json_agg(row_to_json(p)) from pg_policies p where tablename = 'clients' or tablename = 'contractors';
$$;