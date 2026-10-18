-- Create commission_settings table
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_title TEXT NOT NULL,
    action TEXT NOT NULL,
    commission_amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create management_job_titles table
CREATE TABLE IF NOT EXISTS public.management_job_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_title TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_job_titles ENABLE ROW LEVEL SECURITY;

-- Create policies for commission_settings
CREATE POLICY "Admins and super admins can view commission settings" ON public.commission_settings
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('super_admin', 'admin'))
    );

CREATE POLICY "Super admins can manage commission settings" ON public.commission_settings
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
    );

-- Create policies for management_job_titles
CREATE POLICY "Admins and super admins can view management job titles" ON public.management_job_titles
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('super_admin', 'admin'))
    );

CREATE POLICY "Super admins can manage management job titles" ON public.management_job_titles
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
    );

-- Seed initial data based on the image
INSERT INTO public.commission_settings (job_title, action, commission_amount) VALUES
('Sales Manager', '345 Self Generated Lead', 125),
('Sales Manager', '285 Self Generated Lead', 55),
('Sales Manager', '£345 Sold a Lead', 30),
('Sales Manager', '£285 Sold a Lead', 25),
('Lead Generation Manager', '345 Self Generated Lead', 125),
('Lead Generation Manager', '285 Self Generated Lead', 55),
('Lead Generation Manager', '£345 team Lead', 30),
('Lead Generation Manager', '£285 teamLead', 25),
('HR Manager', 'Recruit Lasts 30 days', 150),
('HR Manager', '345 Self Generated Lead', 125),
('HR Manager', '285 Self Generated Lead', 55),
('Marketing Manager', '345 Self Generated Lead', 50),
('Marketing Manager', '285 Self Generated Lead', 40),
('Office Manager', '345 Self Generated Lead', 125),
('Office Manager', '285 Self Generated Lead', 55);

-- Seed management job titles
INSERT INTO public.management_job_titles (job_title) VALUES
('HR Manager'),
('Lead Generation Manager'),
('Sales Manager'),
('Marketing Manager'),
('Office Manager')
ON CONFLICT (job_title) DO NOTHING;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
