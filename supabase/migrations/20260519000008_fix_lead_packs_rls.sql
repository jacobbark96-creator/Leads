DROP POLICY IF EXISTS "Reps can read lead_packs" ON public.lead_packs;
CREATE POLICY "Reps can read lead_packs"
    ON public.lead_packs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('rep', 'representative', 'sales', 'sales_rep', 'admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Reps can select lead_pack_memberships" ON public.lead_pack_memberships;
CREATE POLICY "Reps can select lead_pack_memberships"
    ON public.lead_pack_memberships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('rep', 'representative', 'sales', 'sales_rep', 'admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Reps can update lead_pack_memberships" ON public.lead_pack_memberships;
CREATE POLICY "Reps can update lead_pack_memberships"
    ON public.lead_pack_memberships FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('rep', 'representative', 'sales', 'sales_rep', 'admin', 'super_admin')
        )
    );