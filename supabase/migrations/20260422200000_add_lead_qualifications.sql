-- Add new qualification fields to leads table
alter table public.leads add column if not exists property_ownership varchar(50);
alter table public.leads add column if not exists lease_duration varchar(100);
alter table public.leads add column if not exists likely_to_renew varchar(10);
alter table public.leads add column if not exists landlord_permission text;
alter table public.leads add column if not exists payment_options varchar(100);
alter table public.leads add column if not exists roof_size varchar(100);
alter table public.leads add column if not exists electrical_supply varchar(50);
alter table public.leads add column if not exists solar_location varchar(200);
alter table public.leads add column if not exists availability text;
alter table public.leads add column if not exists job_title varchar(100);
alter table public.leads add column if not exists bills_url text;

-- Create storage bucket for bills if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('lead_documents', 'lead_documents', false)
on conflict (id) do nothing;

-- Set up RLS for the storage bucket
create policy "Authenticated users can read lead documents" 
on storage.objects for select 
using (bucket_id = 'lead_documents' and auth.role() = 'authenticated');

create policy "Admins and sales can upload lead documents" 
on storage.objects for insert 
with check (
  bucket_id = 'lead_documents' 
  and (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role in ('admin', 'super_admin', 'sales')
    )
  )
);
