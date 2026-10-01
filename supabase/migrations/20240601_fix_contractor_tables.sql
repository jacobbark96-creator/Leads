-- Create contractor_reminders table
CREATE TABLE IF NOT EXISTS public.contractor_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reminder_at TIMESTAMPTZ NOT NULL,
    content TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on contractor_reminders
ALTER TABLE public.contractor_reminders ENABLE ROW LEVEL SECURITY;

-- Add policies for contractor_reminders
CREATE POLICY "Users can view their own contractor reminders"
    ON public.contractor_reminders FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));

CREATE POLICY "Users can insert their own contractor reminders"
    ON public.contractor_reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contractor reminders"
    ON public.contractor_reminders FOR UPDATE
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));

CREATE POLICY "Users can delete their own contractor reminders"
    ON public.contractor_reminders FOR DELETE
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));

-- Add contractor_id to files table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='files' AND column_name='contractor_id') THEN
        ALTER TABLE public.files ADD COLUMN contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE;
    END IF;
END $$;
