CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_leads_name_trgm ON public.leads USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_company_trgm ON public.leads USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_location_trgm ON public.leads USING gin (location gin_trgm_ops);
