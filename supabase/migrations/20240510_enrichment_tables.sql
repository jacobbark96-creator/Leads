-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  normalized_name varchar(255),
  company_number varchar(100),
  incorporation_date date,
  sic_code text,
  industry varchar(255),
  employee_count varchar(100),
  estimated_revenue varchar(100),
  net_assets varchar(100),
  website varchar(255),
  linkedin_url varchar(255),
  google_maps_url varchar(255),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  full_name varchar(255),
  role varchar(255),
  email varchar(255),
  mobile varchar(100),
  linkedin_url varchar(255),
  confidence_score integer,
  source varchar(255),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  property_type varchar(100),
  roof_type varchar(100),
  roof_area_estimate numeric,
  solar_potential_score integer,
  epc_rating varchar(10),
  orientation varchar(50),
  estimated_energy_usage numeric,
  installation_complexity varchar(100),
  max_array_panels_count integer,
  max_sunshine_hours_per_year numeric,
  satellite_image_url text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enrichment_jobs table
CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  job_type varchar(100),
  status varchar(50) DEFAULT 'pending',
  attempts integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  response_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create enrichment_cache table
CREATE TABLE IF NOT EXISTS enrichment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key varchar(255) UNIQUE,
  source varchar(100),
  response jsonb,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add enrichment_status to leads if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='enrichment_status') THEN
        ALTER TABLE leads ADD COLUMN enrichment_status varchar(50) DEFAULT 'pending';
    END IF;
END
$$;