-- Create government_grants table
CREATE TABLE IF NOT EXISTS government_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    location TEXT,
    who_can_apply TEXT,
    amount TEXT,
    opening_date TEXT,
    closing_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for searching
CREATE INDEX IF NOT EXISTS idx_gov_grants_location ON government_grants(location);
CREATE INDEX IF NOT EXISTS idx_gov_grants_who_can_apply ON government_grants(who_can_apply);
