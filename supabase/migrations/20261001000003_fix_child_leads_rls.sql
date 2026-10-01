-- Update RLS for leads to allow assigned children to see leads
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
            OR assigned_to_client_id IN (
                SELECT id FROM public.clients
                WHERE user_id = auth.uid()
            )
        )
    );
