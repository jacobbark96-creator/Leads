-- Add permissions to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Ensure 'rep' is a recognized role in any checks if needed (if it's a check constraint, we might need to update it)
-- Usually it's just a text field, but let's be safe.
DO $$ 
BEGIN
  -- If there's a check constraint on role, we might need to recreate it. Assuming it's just VARCHAR/TEXT for now.
END $$;
