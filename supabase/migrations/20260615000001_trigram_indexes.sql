-- Enable pg_trgm for fuzzy phone number searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN trigram indexes for fuzzy searching on phone numbers
CREATE INDEX IF NOT EXISTS idx_leads_phone_trgm ON public.leads USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_secondary_phone_trgm ON public.leads USING gin (secondary_phone gin_trgm_ops);

-- Also for contractors
CREATE INDEX IF NOT EXISTS idx_contractors_phone_trgm ON public.contractors USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contractors_secondary_phone_trgm ON public.contractors USING gin (secondary_phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contractors_other_contact_numbers_trgm ON public.contractors USING gin (other_contact_numbers gin_trgm_ops);
