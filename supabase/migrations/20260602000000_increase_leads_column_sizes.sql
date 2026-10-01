-- Migration to convert VARCHAR fields to TEXT in leads table to prevent upload length errors

ALTER TABLE public.leads
ALTER COLUMN name TYPE TEXT,
ALTER COLUMN company TYPE TEXT,
ALTER COLUMN phone TYPE TEXT,
ALTER COLUMN email TYPE TEXT;

-- We also want to protect against other fields being too small
-- If there are any clients tables that could be affected:
ALTER TABLE public.clients
ALTER COLUMN company_name TYPE TEXT,
ALTER COLUMN contact_name TYPE TEXT,
ALTER COLUMN phone TYPE TEXT;
