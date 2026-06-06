-- Add performance indexes for internal messages
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender ON public.internal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_receiver ON public.internal_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_group ON public.internal_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_created_at ON public.internal_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_messages_is_read ON public.internal_messages(is_read);

-- Also add composite index for the common query
CREATE INDEX IF NOT EXISTS idx_internal_messages_conversation ON public.internal_messages(sender_id, receiver_id, created_at DESC);
