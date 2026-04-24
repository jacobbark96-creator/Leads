alter table public.users add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('profile_photos', 'profile_photos', true)
on conflict (id) do nothing;

create policy "Admins can upload profile photos"
on storage.objects for insert
with check (
  bucket_id = 'profile_photos'
  and (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  )
);

create policy "Admins can update profile photos"
on storage.objects for update
using (
  bucket_id = 'profile_photos'
  and (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  )
)
with check (
  bucket_id = 'profile_photos'
  and (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  )
);
