-- Update track_client_activity to also update the users table's last_active_at
CREATE OR REPLACE FUNCTION track_client_activity(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Update users table last_active_at
    UPDATE public.users 
    SET last_active_at = NOW()
    WHERE id = p_user_id;

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

-- Fix users RLS for Team hierarchy
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data and team members" ON public.users 
    FOR SELECT USING (
        auth.uid() = id 
        OR parent_id = auth.uid()
        OR id IN (SELECT parent_id FROM public.users WHERE id = auth.uid())
    );

-- Fix clients RLS for Team hierarchy
DROP POLICY IF EXISTS "Clients can read own profile" ON public.clients;
CREATE POLICY "Clients can read own profile and team members" ON public.clients 
    FOR SELECT USING (
        user_id = auth.uid()
        OR user_id IN (SELECT id FROM public.users WHERE parent_id = auth.uid())
        OR user_id IN (SELECT parent_id FROM public.users WHERE id = auth.uid())
    );
