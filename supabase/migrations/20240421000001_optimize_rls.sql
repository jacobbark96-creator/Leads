-- Drop existing policies that query public.users
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Staff can read all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Sales can read all leads" ON public.leads;
DROP POLICY IF EXISTS "Sales can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;

-- Recreate Users policies
CREATE POLICY "Admins can read all users" ON public.users 
    FOR SELECT USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "Admins can manage users" ON public.users 
    FOR ALL USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );

-- Recreate Categories policies
CREATE POLICY "Admins can manage categories" ON public.categories 
    FOR ALL USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );

-- Recreate Clients policies
CREATE POLICY "Staff can read all clients" ON public.clients 
    FOR SELECT USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );

CREATE POLICY "Admins can manage clients" ON public.clients 
    FOR ALL USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );

-- Recreate Leads policies
CREATE POLICY "Sales can read all leads" ON public.leads 
    FOR SELECT USING (
        public.get_auth_user_role() = 'sales'
    );

CREATE POLICY "Sales can update leads" ON public.leads 
    FOR UPDATE USING (
        public.get_auth_user_role() = 'sales'
    );

CREATE POLICY "Admins can manage all leads" ON public.leads 
    FOR ALL USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );
