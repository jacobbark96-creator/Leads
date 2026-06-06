-- Create table for Openlead Max settings (FAQs, "How it works" content)
CREATE TABLE IF NOT EXISTS public.openlead_max_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.openlead_max_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to openlead_max_settings"
ON public.openlead_max_settings FOR SELECT
USING (true);

-- Allow admin full access
CREATE POLICY "Allow admin full access to openlead_max_settings"
ON public.openlead_max_settings FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
);

-- Initial seed data
INSERT INTO public.openlead_max_settings (key, value)
VALUES (
    'how_it_works',
    '{
        "title": "How Openlead Max Works",
        "description": "Openlead Max Personal gives you exclusive 14-day dominance over your selected UK territories. No competition, 100% lead volume.",
        "faqs": [
            {"question": "How long is the booking window?", "answer": "Each booking window is exactly 14 days, starting on either the 1st or 14th of each month."},
            {"question": "What is the minimum top-up?", "answer": "To secure territories, a minimum top-up of £2,000 is required."},
            {"question": "Can I cancel my booking?", "answer": "Bookings are final once confirmed to ensure territory exclusivity for all partners."}
        ]
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;
