-- Add indexes to improve monitoring performance
-- client_sessions indexes
CREATE INDEX IF NOT EXISTS idx_client_sessions_user_id ON public.client_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_last_active_at ON public.client_sessions(last_active_at);
CREATE INDEX IF NOT EXISTS idx_client_sessions_session_start ON public.client_sessions(session_start);

-- lead_events indexes
CREATE INDEX IF NOT EXISTS idx_lead_events_user_id ON public.lead_events(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON public.lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_event_type ON public.lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON public.lead_events(created_at);

-- Composite indexes for the specific monitoring queries
CREATE INDEX IF NOT EXISTS idx_lead_events_user_id_event_type ON public.lead_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id_event_type ON public.lead_events(lead_id, event_type);
