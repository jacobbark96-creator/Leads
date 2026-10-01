ALTER TABLE contractor_notes ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
