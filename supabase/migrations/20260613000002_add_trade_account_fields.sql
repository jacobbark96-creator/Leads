-- Add trade account fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS trade_account_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_trade_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_trade_usage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_limit_setting NUMERIC DEFAULT 0;

-- Update RLS policies to allow users to read their own trade account fields
-- (Existing policies might already allow reading all fields for the authenticated user)
