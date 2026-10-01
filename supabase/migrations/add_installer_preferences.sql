-- Add minimum system size and preferred roof types for installer scoring
ALTER TABLE clients 
ADD COLUMN min_system_size_kw NUMERIC,
ADD COLUMN preferred_roof_types JSONB DEFAULT '[]'::jsonb;
