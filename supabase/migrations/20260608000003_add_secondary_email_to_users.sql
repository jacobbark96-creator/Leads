-- Add secondary_email column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_email TEXT;
