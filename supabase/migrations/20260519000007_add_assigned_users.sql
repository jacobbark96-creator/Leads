ALTER TABLE lead_packs ADD COLUMN IF NOT EXISTS assigned_users UUID[] DEFAULT '{}';
