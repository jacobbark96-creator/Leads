-- Add brokerage_status column for the separate tracker
ALTER TABLE leads ADD COLUMN IF NOT EXISTS brokerage_status TEXT DEFAULT NULL;
