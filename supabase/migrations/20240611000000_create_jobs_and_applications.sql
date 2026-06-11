-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    benefits TEXT,
    requirements TEXT,
    location TEXT,
    salary_range TEXT,
    type TEXT,
    is_active BOOLEAN DEFAULT true,
    is_internal BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft', -- 'draft', 'published'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT,
    cover_letter TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'rejected', 'hired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Policies for jobs
-- Public can view published jobs (external only)
DROP POLICY IF EXISTS "Public can view published jobs" ON public.jobs;
CREATE POLICY "Public can view published jobs" ON public.jobs
    FOR SELECT USING (
        status = 'published' AND is_internal = false
    );

-- Staff can view all published jobs (internal and external)
DROP POLICY IF EXISTS "Staff can view all published jobs" ON public.jobs;
CREATE POLICY "Staff can view all published jobs" ON public.jobs
    FOR SELECT USING (
        status = 'published'
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'sales', 'rep', 'growth_manager')
        )
    );

-- Admin/Super Admin can manage all jobs
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
CREATE POLICY "Admins can manage jobs" ON public.jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Policies for job_applications
-- Public can submit applications
DROP POLICY IF EXISTS "Public can submit applications" ON public.job_applications;
CREATE POLICY "Public can submit applications" ON public.job_applications
    FOR INSERT WITH CHECK (true);

-- Staff/Admin can view/manage applications
DROP POLICY IF EXISTS "Staff can view applications" ON public.job_applications;
CREATE POLICY "Staff can view applications" ON public.job_applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'sales', 'rep', 'growth_manager')
        )
    );
