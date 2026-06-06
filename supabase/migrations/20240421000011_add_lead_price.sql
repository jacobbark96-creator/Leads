-- Migration: Add price field to leads for the marketplace
-- Description: Adds a price column to the leads table, defaulting to 135.

ALTER TABLE public.leads 
ADD COLUMN price NUMERIC DEFAULT 135.00;
