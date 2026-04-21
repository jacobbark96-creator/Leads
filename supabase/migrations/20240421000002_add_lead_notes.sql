CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Admins and Sales can manage notes
CREATE POLICY "Sales and Admins can read notes" ON public.lead_notes 
    FOR SELECT USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );

CREATE POLICY "Sales and Admins can insert notes" ON public.lead_notes 
    FOR INSERT WITH CHECK (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );

-- Change the default status for leads
ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'fresh';
