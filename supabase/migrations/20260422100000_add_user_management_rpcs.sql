-- Create banned_emails table
create table if not exists public.banned_emails (
  email text primary key,
  banned_at timestamptz default now()
);

-- Enable RLS on banned_emails
alter table public.banned_emails enable row level security;

-- Function to completely delete a user
create or replace function delete_user_completely(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Ensure caller is super_admin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'super_admin') then
    raise exception 'Unauthorized: Only super admins can delete users';
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
  -- Ensure caller is super_admin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'super_admin') then
    raise exception 'Unauthorized: Only super admins can ban users';
  end if;

  -- Add to banned_emails
  insert into public.banned_emails (email) values (target_email) on conflict do nothing;

  -- Delete the user completely so they can't log in
  delete from auth.users where id = target_user_id;
end;
$$;

-- Create trigger to prevent banned emails from signing up
create or replace function check_banned_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (select 1 from public.banned_emails where email = NEW.email) then
    raise exception 'This email address has been banned.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists ensure_not_banned on auth.users;
create trigger ensure_not_banned
  before insert on auth.users
  for each row
  execute function check_banned_email();