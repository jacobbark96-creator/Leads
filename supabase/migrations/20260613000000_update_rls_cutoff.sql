-- Update policies for leads to exclude old leads for Residential roles
-- Cutoff date: 2026-06-13

DROP POLICY IF EXISTS "Sales can read all leads" ON public.leads;
CREATE POLICY "Sales can read all leads" ON public.leads 
FOR SELECT USING (
    public.get_auth_user_role() = 'super_admin'
    OR public.get_auth_user_role() = 'admin'
    OR (
        public.get_auth_user_role() = 'Residential Rep' 
        AND lead_type = 'residential' 
        AND division_id = public.get_auth_user_division_id()
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Residential Sales' 
        AND lead_type = 'residential' 
        AND division_id = public.get_auth_user_division_id()
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Commercial Sales' 
        AND lead_type = 'commercial' 
        AND division_id = public.get_auth_user_division_id()
    )
    OR (
        public.get_auth_user_role() IN ('rep', 'growth_manager', 'sales') 
        AND (
            (is_private = false AND division_id = public.get_auth_user_division_id())
            OR (is_private = true AND auth.uid() = assigned_to)
        )
    )
);

DROP POLICY IF EXISTS "Sales can update leads" ON public.leads;
CREATE POLICY "Sales can update leads" ON public.leads 
FOR UPDATE USING (
    public.get_auth_user_role() = 'super_admin'
    OR public.get_auth_user_role() = 'admin'
    OR (
        public.get_auth_user_role() = 'Residential Rep' 
        AND lead_type = 'residential' 
        AND division_id = public.get_auth_user_division_id()
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Residential Sales' 
        AND lead_type = 'residential' 
        AND division_id = public.get_auth_user_division_id()
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Commercial Sales' 
        AND lead_type = 'commercial' 
        AND division_id = public.get_auth_user_division_id()
    )
    OR (
        public.get_auth_user_role() IN ('rep', 'growth_manager', 'sales') 
        AND (
            (is_private = false AND division_id = public.get_auth_user_division_id())
            OR (is_private = true AND auth.uid() = assigned_to)
        )
    )
);
