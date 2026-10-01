-- Add UPDATE policy for staff to update any lead purchases
DROP POLICY IF EXISTS "Staff can update all purchases" ON public.lead_purchases;
CREATE POLICY "Staff can update all purchases" ON public.lead_purchases
    FOR UPDATE USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep', 'growth_manager')
    ) WITH CHECK (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep', 'growth_manager')
    );
