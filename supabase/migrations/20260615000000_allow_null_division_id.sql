-- Update policies for leads to allow division_id IS NULL as a fallback
-- This fixes the 406/500 errors when users try to view older leads that don't have a division_id set

DROP POLICY IF EXISTS "Sales can read all leads" ON public.leads;
CREATE POLICY "Sales can read all leads" ON public.leads 
FOR SELECT USING (
    public.get_auth_user_role() = 'super_admin'
    OR public.get_auth_user_role() = 'admin'
    OR (
        public.get_auth_user_role() = 'Residential Rep' 
        AND lead_type = 'residential' 
        AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL)
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Residential Sales' 
        AND lead_type = 'residential' 
        AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL)
        AND created_at >-- Update policies for leads to allow division_id IS NULL as a fallback
-- This fixes the 406/500 "-- This fixes the 406/500 errors when users try to view older leads thn_