CREATE TABLE IF NOT EXISTS public.client_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view client_activities" ON public.client_activities;
CREATE POLICY "Admins can view client_activities" ON public.client_activities 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Users can insert own activities" ON public.client_activities;
CREATE POLICY "Users can insert own activities" ON public.client_activities 
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own activities" ON public.client_activities;
CREATE POLICY "Users can view own activities" ON public.client_activities 
FOR SELECT USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_client_activities_user_id ON public.client_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_created_at ON public.client_activities(created_at);