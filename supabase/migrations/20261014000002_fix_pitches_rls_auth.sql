-- Fix RLS policies for lead_pitches to use public.users instead of auth.users

-- 1. Select Policy
DROP POLICY IF EXISTS "Users can view their own pitches" ON public.lead_pitches;
CREATE POLICY "Users can view their own pitches" ON public.lead_pitches
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('super_admin', 'admin'))
        OR auth.uid() IN (SELECT assigned_to FROM public.leads WHERE id = lead_id)
        OR contractor_id = auth.uid()
    );

-- 2. Insert Policy
DROP POLICY IF EXISTS "Admins and staff can insert pitches" ON public.lead_pitches;
CREATE POLICY "Admins and staff can insert pitches" ON public.lead_pitches
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('super_admin', 'admin', 'sales', 'rep'))
    );

-- 3. Update Policy
DROP POLICY IF EXISTS "Admins and staff can update pitches" ON public.lead_pitches;
CREATE POLICY "Admins and staff can update pitches" ON public.lead_pitches
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('super_admin', 'admin', 'sales', 'rep'))
    );

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';