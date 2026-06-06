-- 1. Update get_staff_users function to include 'rep'
CREATE OR REPLACE FUNCTION public.get_staff_users()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    email VARCHAR,
    role VARCHAR
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY 
    SELECT u.id, u.name, u.email, u.role
    FROM public.users u
    WHERE u.role IN ('admin', 'super_admin', 'sales', 'rep');
END;
$$ LANGUAGE plpgsql;

-- 2. Update Policies to include 'rep'

-- leads
DROP POLICY IF EXISTS "Sales can read all leads" ON public.leads;
CREATE POLICY "Sales can read all leads" ON public.leads FOR SELECT USING (public.get_auth_user_role() IN ('sales', 'rep'));

DROP POLICY IF EXISTS "Sales can update leads" ON public.leads;
CREATE POLICY "Sales can update leads" ON public.leads FOR UPDATE USING (public.get_auth_user_role() IN ('sales', 'rep'));

-- lead_notes
DROP POLICY IF EXISTS "Sales and Admins can read notes" ON public.lead_notes;
CREATE POLICY "Sales and Admins can read notes" ON public.lead_notes FOR SELECT USING (public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));

DROP POLICY IF EXISTS "Sales and Admins can insert notes" ON public.lead_notes;
CREATE POLICY "Sales and Admins can insert notes" ON public.lead_notes FOR INSERT WITH CHECK (public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));

-- contractors
DROP POLICY IF EXISTS "Sales and Admins can manage contractors" ON public.contractors;
CREATE POLICY "Sales and Admins can manage contractors" ON public.contractors FOR ALL USING (public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));

-- contractor_notes
DROP POLICY IF EXISTS "Sales and Admins can manage contractor notes" ON public.contractor_notes;
CREATE POLICY "Sales and Admins can manage contractor notes" ON public.contractor_notes FOR ALL USING (public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));

-- clients
DROP POLICY IF EXISTS "Staff can read all clients" ON public.clients;
CREATE POLICY "Staff can read all clients" ON public.clients FOR SELECT USING (public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));

DROP POLICY IF EXISTS "Admins and Sales can manage clients" ON public.clients;
CREATE POLICY "Admins and Sales can manage clients" ON public.clients FOR ALL USING (public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));

-- lead_purchases
DROP POLICY IF EXISTS "Staff can view all purchases" ON public.lead_purchases;
CREATE POLICY "Staff can view all purchases" ON public.lead_purchases FOR SELECT USING (public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));

-- intranet_resources
DROP POLICY IF EXISTS "Staff can view resources" ON public.intranet_resources;
CREATE POLICY "Staff can view resources" ON public.intranet_resources FOR SELECT USING (public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));

-- storage.objects (intranet-resources)
DROP POLICY IF EXISTS "Staff can read resources" ON storage.objects;
CREATE POLICY "Staff can read resources" ON storage.objects FOR SELECT USING (bucket_id = 'intranet-resources' AND public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'rep'));
