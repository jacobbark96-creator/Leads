-- Add email_signature column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_signature TEXT;
