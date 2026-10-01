ALTER TABLE leads
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS secondary_phone text;
