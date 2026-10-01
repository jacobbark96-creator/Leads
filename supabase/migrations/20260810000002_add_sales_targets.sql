-- Add sales_target to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_target INTEGER DEFAULT 0;

-- Ensure company_sales_target is in system_settings
INSERT INTO system_settings (key, value) 
VALUES ('company_sales_target', '100')
ON CONFLICT (key) DO NOTHING;
