-- Add missing columns to contractors table
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS last_dialed_at TIMESTAMPTZ;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS secondary_phone CHARACTER VARYING;

-- Ensure RLS is correct for contractor_reminders
-- (The migration 20240601_fix_contractor_tables.sql already did this, but let's be sure)
ALTER TABLE public.contractor_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own contractor reminders" ON public.contractor_reminders;
CREATE POLICY "Users can view their own contractor reminders"
    ON public.contractor_reminders FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));
