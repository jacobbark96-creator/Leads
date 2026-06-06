-- Add indices on foreign keys to prevent full table scans during cascading deletes

CREATE INDEX IF NOT EXISTS idx_lead_pack_memberships_lead_id ON lead_pack_memberships(lead_id);
CREATE INDEX IF NOT EXISTS idx_magic_checkout_links_lead_id ON magic_checkout_links(lead_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_usages_lead_id ON discount_code_usages(lead_id);
CREATE INDEX IF NOT EXISTS idx_companies_lead_id ON companies(lead_id);
CREATE INDEX IF NOT EXISTS idx_buildings_lead_id ON buildings(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_lead_id ON lead_purchases(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_lead_id ON lead_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_files_lead_id ON files(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_lead_id ON enrichment_jobs(lead_id);
