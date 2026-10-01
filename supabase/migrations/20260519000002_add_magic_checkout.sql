-- Create magic_checkout_links table
CREATE TABLE IF NOT EXISTS public.magic_checkout_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    stripe_session_id VARCHAR(255) NOT NULL,
    stripe_url TEXT NOT NULL,
    created_by UUID REFERENCES public.users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    reservation_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.magic_checkout_links ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admins can manage magic links" ON public.magic_checkout_links
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'super_admin')
    );

-- Allow public read of token details (only if they have the exact token uuid)
CREATE POLICY "Anyone can read magic links with token" ON public.magic_checkout_links
    FOR SELECT USING (true); -- Filtered at app level by UUID

-- Optional: Create a function to check reservation
CREATE OR REPLACE FUNCTION is_lead_reserved(p_lead_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.magic_checkout_links
        WHERE lead_id = p_lead_id
        AND used_at IS NULL
        AND reservation_expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
