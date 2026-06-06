CREATE INDEX IF NOT EXISTS idx_leads_phone_trgm ON public.leads USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_secondary_phone_trgm ON public.leads USING gin (secondary_phone gin_trgm_ops);
