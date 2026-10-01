-- Add assigned_to_client_id to lead_purchases
ALTER TABLE public.lead_purchases
ADD COLUMN IF NOT EXISTS assigned_to_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_lead_purchases_assigned_to ON public.lead_purchases(assigned_to_client_id);

-- Update RLS for lead_purchases to allow assigned children to see the lead
-- The existing policy is:
-- CREATE POLICY "Clients can view their own and child purchases" ON public.lead_purchases
--     FOR SELECT USING (
--         client_id IN (
--             SELECT id FROM public.clients 
--             WHERE user_id = auth.uid() 
--             OR user_id IN (SELECT id FROM public.users WHERE parent_id = auth.uid())
--         )
--     );

-- We need to extend this so child accounts can see leads assigned to them even if they don't "own" (client_id) them.
-- Actually, the existing policy allows parents to see child leads.
-- We need to allow child accounts to see leads assigned to them by their parent.

DROP POLICY IF EXISTS "Clients can view their own and child purchases" ON public.lead_purchases;
CREATE POLICY "Clients can view their own, child, and assigned purchases" ON public.lead_purchases
    FOR SELECT USING (
        -- User owns the purchase
        client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
        OR
        -- User is a parent and owns the child's purchase
        client_id IN (
            SELECT id FROM public.clients 
            WHERE user_id IN (SELECT id FROM public.users WHERE parent_id = auth.uid())
        )
        OR
        -- Lead is assigned to the user
        assigned_to_client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    );

-- Allow updates to assigned_to_client_id by the owner (parent)
DROP POLICY IF EXISTS "Clients can update their own purchases" ON public.lead_purchases;
CREATE POLICY "Clients can update their own purchases" ON public.lead_purchases
    FOR UPDATE USING (
        client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    )
    WITH CHECK (
        client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    );
