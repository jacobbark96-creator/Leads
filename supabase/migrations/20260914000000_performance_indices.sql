-- Add missing indexes for chat and SMS messages to improve query performance
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender_id ON public.internal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_receiver_id ON public.internal_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_group_id ON public.internal_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_created_at ON public.internal_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON public.sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_contact_number ON public.sms_messages(contact_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON public.sms_messages(created_at DESC);

-- Add indexes for activities to speed up live feed and stats
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON public.activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

-- Composite index for lead counts
CREATE INDEX IF NOT EXISTS idx_leads_status_is_in_pack ON public.leads(status, is_in_pack);
