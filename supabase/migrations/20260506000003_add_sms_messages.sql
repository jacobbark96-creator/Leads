CREATE TABLE IF NOT EXISTS public.sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    contact_number VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sms" ON public.sms_messages
    FOR ALL USING (auth.uid() = user_id);
    
-- Allow service_role to bypass RLS (handled by default in Supabase)
