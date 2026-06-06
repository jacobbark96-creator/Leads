ALTER TABLE leads
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS company_type text,
ADD COLUMN IF NOT EXISTS company_number text,
ADD COLUMN IF NOT EXISTS revenue text,
ADD COLUMN IF NOT EXISTS employees text,
ADD COLUMN IF NOT EXISTS est_ann_generation text,
ADD COLUMN IF NOT EXISTS est_savings numeric,
ADD COLUMN IF NOT EXISTS est_payback text,
ADD COLUMN IF NOT EXISTS building_type text,
ADD COLUMN IF NOT EXISTS epc_rating text;
