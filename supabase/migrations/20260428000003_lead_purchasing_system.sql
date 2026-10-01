-- Add new fields to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS exclusive_price NUMERIC DEFAULT 135.00,
ADD COLUMN IF NOT EXISTS share_price NUMERIC DEFAULT 45.00,
ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_exclusive_sold BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_shares INTEGER DEFAULT 3;

-- Create lead_purchases table
CREATE TABLE IF NOT EXISTS public.lead_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    purchase_type VARCHAR(20) NOT NULL CHECK (purchase_type IN ('exclusive', 'share')),
    price_paid NUMERIC NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for lead_purchases
CREATE INDEX IF NOT EXISTS idx_lead_purchases_lead_id ON public.lead_purchases(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_client_id ON public.lead_purchases(client_id);

-- Enable RLS on lead_purchases
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

-- RLS for lead_purchases
CREATE POLICY "Clients can view their own purchases" ON public.lead_purchases
    FOR SELECT USING (
        client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Staff can view all purchases" ON public.lead_purchases
    FOR SELECT USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );

-- We need to update the existing RLS policy for leads to allow clients to read leads they've purchased via lead_purchases
DROP POLICY IF EXISTS "Clients can read own leads" ON public.leads;
CREATE POLICY "Clients can read own leads" ON public.leads 
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.clients WHERE id = public.leads.client_id)
        OR
        id IN (SELECT lead_id FROM public.lead_purchases WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
    );

-- Migrate existing sold leads to lead_purchases
INSERT INTO public.lead_purchases (lead_id, client_id, purchase_type, price_paid, purchased_at)
SELECT id, client_id, 'exclusive', COALESCE(price, 135.00), COALESCE(purchase_date, NOW())
FROM public.leads
WHERE status = 'sold' AND client_id IS NOT NULL;

-- Mark them as exclusive sold
UPDATE public.leads
SET is_exclusive_sold = true, purchase_count = 1
WHERE status = 'sold' AND client_id IS NOT NULL;
