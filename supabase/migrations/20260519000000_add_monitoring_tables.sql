-- Client Sessions for tracking time spent and last login
CREATE TABLE IF NOT EXISTS public.client_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0
);

-- Lead Events for tracking views, checkouts, etc.
CREATE TABLE IF NOT EXISTS public.lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'order_summary', 'checkout')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- Admins can read all
CREATE POLICY "Admins can view client_sessions" ON public.client_sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can view lead_events" ON public.lead_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

-- Users can insert/update their own events
CREATE POLICY "Users can insert own sessions" ON public.client_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.client_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own lead events" ON public.lead_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own lead events" ON public.lead_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view own sessions" ON public.client_sessions FOR SELECT USING (user_id = auth.uid());

-- Add tracking RPC for easy calling from the frontend
CREATE OR REPLACE FUNCTION track_client_activity(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Find an active session in the last 15 minutes
    SELECT id INTO v_session_id
    FROM public.client_sessions
    WHERE user_id = p_user_id 
    AND last_active_at > (NOW() - INTERVAL '15 minutes')
    ORDER BY last_active_at DESC
    LIMIT 1;

    IF v_session_id IS NOT NULL THEN
        -- Update existing session
        UPDATE public.client_sessions
        SET 
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER,
            last_active_at = NOW()
        WHERE id = v_session_id;
    ELSE
        -- Create new session
        INSERT INTO public.client_sessions (user_id, session_start, last_active_at, duration_seconds)
        VALUES (p_user_id, NOW(), NOW(), 0);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
