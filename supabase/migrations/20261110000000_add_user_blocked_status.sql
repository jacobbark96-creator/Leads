ALTER TABLE public.users ADD COLUMN is_blocked boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN block_reason text;
ALTER TABLE public.users ADD COLUMN outstanding_amount numeric DEFAULT 0;
