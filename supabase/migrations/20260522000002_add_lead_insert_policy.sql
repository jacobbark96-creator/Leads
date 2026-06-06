-- Add policy to allow sales and reps to insert leads if they have permission
CREATE POLICY "Sales can insert leads with permission" ON public.leads
FOR INSERT WITH CHECK (
    public.get_auth_user_role() IN ('sales', 'rep') AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND permissions @> '"can_add_leads"'::jsonb
    )
);
