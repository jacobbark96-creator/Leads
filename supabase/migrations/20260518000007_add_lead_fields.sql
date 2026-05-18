ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS night_unit_rate numeric,
ADD COLUMN IF NOT EXISTS sole_decision_maker boolean DEFAULT false;
