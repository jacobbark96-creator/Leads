ALTER TABLE public.lead_purchases ADD COLUMN IF NOT EXISTS credit_used NUMERIC DEFAULT 0;
