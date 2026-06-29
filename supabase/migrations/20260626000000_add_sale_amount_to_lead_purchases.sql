ALTER TABLE public.lead_purchases 
ADD COLUMN IF NOT EXISTS sale_amount NUMERIC DEFAULT 0;