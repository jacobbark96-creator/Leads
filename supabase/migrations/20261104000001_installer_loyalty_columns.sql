-- Add tracking columns to installers table for the loyalty loop
ALTER TABLE public.installers 
ADD COLUMN IF NOT EXISTS paid_leads_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_credits_available INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_start_date TIMESTAMP WITH TIME ZONE;
