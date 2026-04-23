-- Add client_id to contractors if it doesn't exist
alter table public.contractors add column if not exists client_id uuid references public.clients(id) on delete set null;

-- Add company_name and contact_name to contractors if they don't exist (to match the API usage)
-- Or we can just rename them or add them as new columns.
alter table public.contractors add column if not exists company_name varchar(200);
alter table public.contractors add column if not exists contact_name varchar(100);

-- Make name and phone nullable in case we use company_name and contact_name instead
alter table public.contractors alter column name drop not null;
alter table public.contractors alter column phone drop not null;
