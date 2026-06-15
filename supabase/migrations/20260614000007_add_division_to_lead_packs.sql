-- Add division_id to lead_packs table
ALTER TABLE public.lead_packs 
ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_lead_packs_division_id ON public.lead_packs(division_id);
