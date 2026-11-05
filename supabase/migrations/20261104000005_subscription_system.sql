-- Add Subscription Columns to Clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS subscription_tier INTEGER DEFAULT 0, -- 0 = None, 5 = 5 leads/mo, 10 = 10 leads/mo
ADD COLUMN IF NOT EXISTS subscription_credits INTEGER DEFAULT 0;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
