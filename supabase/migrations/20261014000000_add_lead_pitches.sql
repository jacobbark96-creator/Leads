CREATE TABLE IF NOT EXISTS public.lead_pitches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    contractor_number TEXT,
    message_body TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.lead_pitches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own pitches" ON public.lead_pitches
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE role IN ('super_admin', 'admin')
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.leads WHERE id = lead_id
        )
        OR
        contractor_id = auth.uid()
    );

CREATE POLICY "Admins and staff can insert pitches" ON public.lead_pitches
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE role IN ('super_admin', 'admin', 'sales', 'rep')
        )
    );

CREATE POLICY "Admins and staff can update pitches" ON public.lead_pitches
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE role IN ('super_admin', 'admin', 'sales', 'rep')
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lead_pitches_updated_at
    BEFORE UPDATE ON public.lead_pitches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
