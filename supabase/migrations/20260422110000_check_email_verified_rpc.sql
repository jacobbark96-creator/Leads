-- Function to check if a specific email has been verified
create or replace function check_email_verified(lookup_email text)
returns boolean
language plpgsql
security definer -- Needs security definer to access auth.users
set search_path = public, auth
as $$
declare
  is_verified boolean;
begin
  select (email_confirmed_at is not null) into is_verified
  from auth.users
  where email = lookup_email
  limit 1;
  
  return coalesce(is_verified, false);
end;
$$;