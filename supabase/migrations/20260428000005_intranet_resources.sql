-- Create intranet resources table
CREATE TABLE IF NOT EXISTS public.intranet_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('pdf', 'excel', 'link')),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.intranet_resources ENABLE ROW LEVEL SECURITY;

-- Policies for resources (only staff can view, only super_admins can insert/delete)
CREATE POLICY "Staff can view resources" ON public.intranet_resources
    FOR SELECT USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );

CREATE POLICY "Super admins can manage resources" ON public.intranet_resources
    FOR ALL USING (
        public.get_auth_user_role() = 'super_admin'
    );

-- Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public) 
VALUES ('intranet-resources', 'intranet-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Staff can read resources" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'intranet-resources' AND
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );

CREATE POLICY "Super admins can upload resources" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'intranet-resources' AND
        public.get_auth_user_role() = 'super_admin'
    );

CREATE POLICY "Super admins can update resources" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'intranet-resources' AND
        public.get_auth_user_role() = 'super_admin'
    );

CREATE POLICY "Super admins can delete resources" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'intranet-resources' AND
        public.get_auth_user_role() = 'super_admin'
    );
