-- Add is_in_pack column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_in_pack BOOLEAN DEFAULT false;

-- Update existing leads based on memberships
UPDATE public.leads 
SET is_in_pack = true 
WHERE id IN (SELECT lead_id FROM public.lead_pack_memberships);

-- Create an index for faster filtering in the CRM
CREATE INDEX IF NOT EXISTS idx_leads_is_in_pack ON public.leads(is_in_pack);
