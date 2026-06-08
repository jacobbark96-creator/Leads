-- Add sent_to_sales column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sent_to_sales BOOLEAN DEFAULT FALSE;
