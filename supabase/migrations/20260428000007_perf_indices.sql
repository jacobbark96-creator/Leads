CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_is_marketed ON public.leads(is_marketed);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON public.contractors(status);
CREATE INDEX IF NOT EXISTS idx_contractors_assigned_to ON public.contractors(assigned_to);
