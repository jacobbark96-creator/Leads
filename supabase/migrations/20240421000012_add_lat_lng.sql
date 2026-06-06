-- Migration: Add latitude and longitude to clients and leads for map
-- Description: Adds coordinates for mapping onboarded contractors and available leads.

ALTER TABLE public.clients 
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC;

ALTER TABLE public.leads 
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC;
