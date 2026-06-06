-- Create divisions table
CREATE TABLE IF NOT EXISTS divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add division_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);

-- Insert default division
INSERT INTO divisions (name) VALUES ('OpenEnergy') ON CONFLICT (name) DO NOTHING;

-- Enable RLS on divisions
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;

-- Policies for divisions
CREATE POLICY "Divisions are viewable by all users" ON divisions
    FOR SELECT USING (true);

CREATE POLICY "Divisions are manageable by super_admins" ON divisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );
