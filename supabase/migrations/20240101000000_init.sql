-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'sales', 'admin', 'super_admin')),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    company VARCHAR(200),
    status VARCHAR(50) DEFAULT 'new',
    purchase_date TIMESTAMP WITH TIME ZONE,
    booking_date TIMESTAMP WITH TIME ZONE,
    csv_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_category_id ON leads(category_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_purchase_date ON leads(purchase_date DESC);

-- Grant permissions to public schemas
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions to tables
GRANT SELECT ON public.users TO anon;
GRANT ALL PRIVILEGES ON public.users TO authenticated;

GRANT SELECT ON public.categories TO anon;
GRANT ALL PRIVILEGES ON public.categories TO authenticated;

GRANT SELECT ON public.clients TO anon;
GRANT ALL PRIVILEGES ON public.clients TO authenticated;

GRANT SELECT ON public.leads TO anon;
GRANT ALL PRIVILEGES ON public.leads TO authenticated;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data" ON public.users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON public.users 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admins can manage users" ON public.users 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Categories policies
CREATE POLICY "Anyone can read active categories" ON public.categories 
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Clients policies
CREATE POLICY "Clients can read own profile" ON public.clients 
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Staff can read all clients" ON public.clients 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('sales', 'admin', 'super_admin'))
    );

CREATE POLICY "Admins can manage clients" ON public.clients 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Leads policies
CREATE POLICY "Clients can read own leads" ON public.leads 
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.clients WHERE id = public.leads.client_id)
    );

CREATE POLICY "Sales can read all leads" ON public.leads 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'sales')
    );

CREATE POLICY "Sales can update leads" ON public.leads 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'sales')
    );

CREATE POLICY "Admins can manage all leads" ON public.leads 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Initial User Trigger to bootstrap super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
    user_role VARCHAR(50);
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.users) INTO is_first_user;
    
    -- In a real app, you might want to invite users with specific roles, 
    -- but for initial bootstrap, first user is super_admin.
    IF is_first_user THEN
        user_role := 'super_admin';
    ELSE
        -- By default, fall back to whatever was passed in metadata, or 'client'
        user_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
    END IF;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        user_role
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial default categories
INSERT INTO public.categories (name, is_active) VALUES ('Solar', true);
INSERT INTO public.categories (name, is_active) VALUES ('Solar Cleaning', true);
INSERT INTO public.categories (name, is_active) VALUES ('Roofing', true);
INSERT INTO public.categories (name, is_active) VALUES ('Asbestos', true);