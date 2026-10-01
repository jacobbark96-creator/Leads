-- Add requires_password_change column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

-- Update child accounts logic in the future will set this to true
-- For now, let's set it to true for any existing users with a parent_id who haven't logged in much (optional, but safer to just default to false for existing)
