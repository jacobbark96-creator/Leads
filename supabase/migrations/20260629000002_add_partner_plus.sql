ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_partner_plus BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS partner_plus_status TEXT;
