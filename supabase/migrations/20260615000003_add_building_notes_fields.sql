
-- Add marketplace_notes and use_primary_notes to buildings table
ALTER TABLE public.buildings 
ADD COLUMN IF NOT EXISTS marketplace_notes TEXT,
ADD COLUMN IF NOT EXISTS use_primary_notes BOOLEAN DEFAULT false;

-- Add a trigger to update updated_at if it doesn't exist for the new columns
-- (Assuming updated_at trigger is already there, but just in case)
