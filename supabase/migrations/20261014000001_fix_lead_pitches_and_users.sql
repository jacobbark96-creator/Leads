-- 1. Add whatsapp_enabled to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;

-- 2. Fix lead_pitches policy (leads table uses assigned_to, not user_id)
DROP POLICY IF EXISTS "Users can view their own pitches" ON public.lead_pitches;

CREATE POLICY "Users can view their own pitches" ON public.lead_pitches
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE role IN ('super_admin', 'admin')
        )
        OR
        auth.uid() IN (
            SELECT assigned_to FROM public.leads WHERE id = lead_id
        )
        OR
        contractor_id = auth.uid()
    );

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
