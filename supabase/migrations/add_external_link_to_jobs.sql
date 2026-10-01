-- Add external_link column to jobs table for Flowmingo integration
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_link TEXT;
