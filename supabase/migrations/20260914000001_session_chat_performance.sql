-- Optimize client sessions for the track_client_activity RPC
CREATE INDEX IF NOT EXISTS idx_client_sessions_user_last_active ON public.client_sessions(user_id, last_active_at DESC);

-- Optimize internal messages for group unread counts and conversation lists
CREATE INDEX IF NOT EXISTS idx_internal_messages_group_created_at ON public.internal_messages(group_id, created_at DESC);

-- Composite index for receiver unread counts
CREATE INDEX IF NOT EXISTS idx_internal_messages_receiver_read_sender ON public.internal_messages(receiver_id, is_read, sender_id);

-- Optimize activities for KPI counts
CREATE INDEX IF NOT EXISTS idx_activities_type_created_at ON public.activities(activity_type, created_at DESC);

-- Optimize lead purchases for revenue calculations
CREATE INDEX IF NOT EXISTS idx_lead_purchases_status_purchased_at ON public.lead_purchases(status, purchased_at DESC);

-- Optimize user creation tracking
CREATE INDEX IF NOT EXISTS idx_users_role_created_at ON public.users(role, created_at DESC);

