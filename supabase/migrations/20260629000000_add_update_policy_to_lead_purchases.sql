-- Add UPDATE policy for clients to update their own lead purchases (e.g. status, sale_amount)
DROP POLICY IF EXISTS "Clients can update their own purchases" ON public.lead_purchases;
CREATE POLICY "Clients can update their own purchases" ON public.lead_purchases
    FOR UPDATE USING (
        client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    ) WITH CHECK (
        client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    );
