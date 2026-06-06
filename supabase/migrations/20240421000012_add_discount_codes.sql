-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    allowed_client_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Policies for discount_codes
-- Anyone authenticated can read active discount codes
CREATE POLICY "Anyone can read active discount codes"
    ON discount_codes
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Only admins and super_admins can insert/update/delete discount codes
CREATE POLICY "Admins can manage discount codes"
    ON discount_codes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Create discount_code_usages table to track who used what
CREATE TABLE IF NOT EXISTS discount_code_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_code_id UUID REFERENCES discount_codes(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE discount_code_usages ENABLE ROW LEVEL SECURITY;

-- Policies for discount_code_usages
-- Clients can read their own usages
CREATE POLICY "Clients can read own usages"
    ON discount_code_usages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM clients
            WHERE clients.id = discount_code_usages.client_id
            AND clients.user_id = auth.uid()
        )
    );

-- Admins can read all usages
CREATE POLICY "Admins can read all usages"
    ON discount_code_usages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Authenticated users can insert usages (when purchasing)
CREATE POLICY "Authenticated users can insert usages"
    ON discount_code_usages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE discount_codes
    SET current_uses = current_uses + 1
    WHERE id = NEW.discount_code_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment usage count when a usage is recorded
CREATE TRIGGER on_discount_used
    AFTER INSERT ON discount_code_usages
    FOR EACH ROW
    EXECUTE FUNCTION increment_discount_usage();
