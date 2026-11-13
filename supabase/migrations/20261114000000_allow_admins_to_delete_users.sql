-- Function to completely delete a user
create or replace function delete_user_completely(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Ensure caller is super_admin or admin
  if not exists (select 1 from public.users where id = auth.uid() and role in ('super_admin', 'admin')) then
    raise exception 'Unauthorized: Only admins and super admins can delete users';
  end if;

  -- Delete from auth.users (this cascades to public.users via foreign key)
  delete from auth.users where id = target_user_id;
end;
$$;

-- Function to ban a user completely
create or replace function ban_user_completely(target_user_id uuid, target_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Ensure caller is super_admin or admin
  if not exists (select 1 from public.users where id = auth.uid() and role in ('super_admin', 'admin')) then
    raise exception 'Unauthorized: Only admins and super admins can ban users';
  end if;

  -- Add to banned_emails
  insert into public.banned_emails (email) values (target_email) on conflict do nothing;

  -- Delete the user completely so they can't log in
  delete from auth.users where id = target_user_id;
end;
$$;
