ALTER TABLE public.lead_purchases
ADD COLUMN IF NOT EXISTS has_concierge BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS concierge_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS concierge_dates JSONB DEFAULT '[]'::jsonb;
