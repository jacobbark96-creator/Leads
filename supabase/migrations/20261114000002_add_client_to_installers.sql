alter table public.installers add column if not exists client_id uuid references public.users(id) on delete set null;
