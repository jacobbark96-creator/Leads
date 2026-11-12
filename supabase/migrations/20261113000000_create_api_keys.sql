-- Create api_keys table for external API access
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only service_role can access api_keys by default
CREATE POLICY "Service role has full access to api_keys" ON public.api_keys
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create an index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys (key);

-- Insert the initial God Mode API key
INSERT INTO public.api_keys (key, name)
VALUES (
    'gm_live_a255acc146e620054fce257ecb53b52c1d4564aa8cb8056e',
    'God Mode Read Only'
)
ON CONFLICT DO NOTHING;
