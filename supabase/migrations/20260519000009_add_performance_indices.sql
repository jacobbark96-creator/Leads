-- Add indices to speed up common queries and prevent statement timeouts

-- Indices on leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_upload_name ON leads(upload_name);

-- Indices on lead_notes
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at DESC);

-- Indices on contractors
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_contractors_assigned_to ON contractors(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contractors_created_at ON contractors(created_at DESC);

