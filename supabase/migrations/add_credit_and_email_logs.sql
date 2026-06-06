-- Add credit_balance to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;

-- Create email_logs table for rate-limiting emails
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    email_type VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_logs_client_type_sent ON email_logs(client_id, email_type, sent_at);
