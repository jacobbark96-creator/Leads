-- Add field to track when user accepted OpenLead Flex terms
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS flex_terms_accepted_at TIMESTAMPTZ;
