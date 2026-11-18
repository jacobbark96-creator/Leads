DROP POLICY IF EXISTS "Users can view their own reminders" ON public.lead_reminders;
DROP POLICY IF EXISTS "Authenticated users can view all reminders" ON public.lead_reminders;

CREATE POLICY "Authenticated users can view all reminders" ON public.lead_reminders
    FOR SELECT USING (auth.role() = 'authenticated');

-- It's also helpful if they can complete (update) or delete tasks for a lead they are working on
DROP POLICY IF EXISTS "Users can update their own reminders" ON public.lead_reminders;
DROP POLICY IF EXISTS "Authenticated users can update all reminders" ON public.lead_reminders;

CREATE POLICY "Authenticated users can update all reminders" ON public.lead_reminders
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.lead_reminders;
DROP POLICY IF EXISTS "Authenticated users can delete all reminders" ON public.lead_reminders;

CREATE POLICY "Authenticated users can delete all reminders" ON public.lead_reminders
    FOR DELETE USING (auth.role() = 'authenticated');
