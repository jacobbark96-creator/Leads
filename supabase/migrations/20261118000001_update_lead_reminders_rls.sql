-- Drop all existing policies on lead_reminders to start fresh
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.lead_reminders;
DROP POLICY IF EXISTS "Authenticated users can view all reminders" ON public.lead_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON public.lead_reminders;
DROP POLICY IF EXISTS "Authenticated users can update all reminders" ON public.lead_reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.lead_reminders;
DROP POLICY IF EXISTS "Authenticated users can delete all reminders" ON public.lead_reminders;

-- 1. View: Anyone authenticated can view (allows users to see tasks set by others)
CREATE POLICY "Authenticated users can view all reminders" 
    ON public.lead_reminders FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 2. Update: Only the creator (user_id) can update/complete the task
CREATE POLICY "Users can update their own reminders" 
    ON public.lead_reminders FOR UPDATE 
    USING (auth.uid() = user_id);

-- Note: We are deliberately NOT creating a DELETE policy.
-- This ensures that no user can delete a task.
