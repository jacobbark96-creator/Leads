ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS full_name varchar(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role varchar(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email varchar(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile varchar(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url varchar(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS confidence_score integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source varchar(255);
NOTIFY pgrst, 'reload schema';
