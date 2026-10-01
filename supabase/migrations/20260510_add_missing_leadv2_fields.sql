ALTER TABLE leads
ADD COLUMN IF NOT EXISTS primary_need text,
ADD COLUMN IF NOT EXISTS monthly_spend numeric,
ADD COLUMN IF NOT EXISTS timeframe text,
ADD COLUMN IF NOT EXISTS property_ownership text,
ADD COLUMN IF NOT EXISTS est_system_size text,
ADD COLUMN IF NOT EXISTS est_ann_consumption numeric,
ADD COLUMN IF NOT EXISTS electrical_supply text,
ADD COLUMN IF NOT EXISTS roof_material text,
ADD COLUMN IF NOT EXISTS roof_condition text,
ADD COLUMN IF NOT EXISTS roof_size text,
ADD COLUMN IF NOT EXISTS solar_location text,
ADD COLUMN IF NOT EXISTS location text;
