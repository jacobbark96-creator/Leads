-- Migration: Add RLS policies for marketplace
-- Description: Allow clients to read marketed leads and purchase them by setting their client_id.

-- Allow clients to read marketed leads that have not been purchased
CREATE POLICY "Clients can read marketed leads" ON public.leads 
    FOR SELECT USING (
        is_marketed = true AND client_id IS NULL
    );

-- Allow clients to purchase marketed leads
-- The USING clause ensures they can only update rows that are currently marketed and unassigned
-- The WITH CHECK clause ensures they can only set the client_id to their own client record
CREATE POLICY "Clients can purchase marketed leads" ON public.leads 
    FOR UPDATE USING (
        is_marketed = true AND client_id IS NULL
    ) WITH CHECK (
        client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    );
