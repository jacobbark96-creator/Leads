CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id),
    subcategory_id UUID REFERENCES public.categories(id),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    company VARCHAR(200),
    status VARCHAR(50) DEFAULT 'fresh',
    csv_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contractors_status ON public.contractors(status);
CREATE INDEX idx_contractors_created_at ON public.contractors(created_at DESC);

CREATE TABLE IF NOT EXISTS public.contractor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_notes ENABLE ROW LEVEL SECURITY;

-- Admins and Sales can manage contractors
CREATE POLICY "Sales and Admins can manage contractors" ON public.contractors 
    FOR ALL USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );

CREATE POLICY "Sales and Admins can manage contractor notes" ON public.contractor_notes 
    FOR ALL USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );
