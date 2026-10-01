-- Add invited_at to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
