-- Add default_sender_email to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS default_sender_email TEXT;

-- Add gmail_message_id to lead_notes to prevent duplicate syncing
ALTER TABLE public.lead_notes 
ADD COLUMN IF NOT EXISTS gmail_message_id TEXT UNIQUE;

-- Add index for faster lookups during sync
CREATE INDEX IF NOT EXISTS idx_lead_notes_gmail_message_id ON public.lead_notes(gmail_message_id);
