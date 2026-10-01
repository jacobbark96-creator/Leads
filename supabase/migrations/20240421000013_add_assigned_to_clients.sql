-- Add assigned_to to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
