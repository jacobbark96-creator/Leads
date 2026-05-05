ALTER TABLE public.lead_purchases
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'sat', 'won'));

CREATE INDEX IF NOT EXISTS idx_lead_purchases_status ON public.lead_purchases(status);
