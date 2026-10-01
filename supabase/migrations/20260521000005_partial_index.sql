CREATE INDEX IF NOT EXISTS idx_leads_active_not_in_pack 
ON leads(status, assigned_to) 
WHERE is_in_pack = false AND status != 'qualified';
