-- Migration: Add extra fields to clients table for contractor onboarding
-- Description: Adds other_contacts, other_contact_numbers, address, areas_covered, services_offered, and internal_notes.

ALTER TABLE public.clients 
ADD COLUMN other_contacts TEXT,
ADD COLUMN other_contact_numbers TEXT,
ADD COLUMN address TEXT,
ADD COLUMN areas_covered TEXT,
ADD COLUMN services_offered TEXT,
ADD COLUMN internal_notes TEXT;
