-- Update lead insert policy to include growth_manager
DROP POLICY IF EXISTS "Sales can insert leads with permission" ON public.leads;
CREATE POLICY "Sales can insert leads with permission" ON public.leads
FOR INSERT WITH CHECK (
    public.get_auth_user_role() IN ('sales', 'rep', 'growth_manager') AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND (
            permissions @> '"can_add_leads"'::jsonb
            OR role = 'growth_manager'
        )
    )
);
