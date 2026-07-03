-- Add child account fields to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS allowed_child_accounts BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.users(id);

-- Update lead_purchases status constraint to include permission_pending
-- First, check if the constraint exists and drop it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_purchases_status_check') THEN
        ALTER TABLE public.lead_purchases DROP CONSTRAINT lead_purchases_status_check;
    END IF;
END $$;

ALTER TABLE public.lead_purchases 
ADD CONSTRAINT lead_purchases_status_check 
CHECK (status::text = ANY (ARRAY['new'::text, 'sat'::text, 'won'::text, 'permission_pending'::text]));

-- Update RLS for lead_purchases to allow parents to see child purchases
DROP POLICY IF EXISTS "Clients can view their own purchases" ON public.lead_purchases;
CREATE POLICY "Clients can view their own and child purchases" ON public.lead_purchases
    FOR SELECT USING (
        client_id IN (
            SELECT id FROM public.clients 
            WHERE user_id = auth.uid() 
            OR user_id IN (SELECT id FROM public.users WHERE parent_id = auth.uid())
        )
    );

-- Update RLS for leads to allow parents to see child leads
DROP POLICY IF EXISTS "Clients can read own leads" ON public.leads;
CREATE POLICY "Clients can read own leads" ON public.leads 
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.clients WHERE id = public.leads.client_id)
        OR
        id IN (
            SELECT lead_id FROM public.lead_purchases 
            WHERE client_id IN (
                SELECT id FROM public.clients 
                WHERE user_id = auth.uid() 
                OR user_id IN (SELECT id FROM public.users WHERE parent_id = auth.uid())
            )
        )
    );
