-- Add columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS being_dialed_by UUID REFERENCES users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_dialed_at TIMESTAMPTZ;

-- Add is_pinned to lead_notes
ALTER TABLE lead_notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create lead_reminders table
CREATE TABLE IF NOT EXISTS lead_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reminder_at TIMESTAMPTZ NOT NULL,
    content TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lead_reminders
ALTER TABLE lead_reminders ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for lead_reminders
CREATE POLICY "Users can view their own reminders" ON lead_reminders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders" ON lead_reminders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" ON lead_reminders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON lead_reminders
    FOR DELETE USING (auth.uid() = user_id);
