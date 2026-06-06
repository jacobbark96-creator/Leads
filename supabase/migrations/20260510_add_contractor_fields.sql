ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS member_since text,
ADD COLUMN IF NOT EXISTS coverage_area text,
ADD COLUMN IF NOT EXISTS installers_count text,
ADD COLUMN IF NOT EXISTS certifications text,
ADD COLUMN IF NOT EXISTS insurance text,
ADD COLUMN IF NOT EXISTS payment_terms text,
ADD COLUMN IF NOT EXISTS project_type text,
ADD COLUMN IF NOT EXISTS system_size text,
ADD COLUMN IF NOT EXISTS lead_types text,
ADD COLUMN IF NOT EXISTS max_distance text;
