ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS roof_suitability text,
ADD COLUMN IF NOT EXISTS solar_exposure text,
ADD COLUMN IF NOT EXISTS shading text,
ADD COLUMN IF NOT EXISTS marketplace_notes text,
ADD COLUMN IF NOT EXISTS orientation text;
