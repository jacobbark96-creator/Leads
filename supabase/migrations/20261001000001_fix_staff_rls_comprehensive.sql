-- 1. Update get_staff_users function to include all staff roles
CREATE OR REPLACE FUNCTION public.get_staff_users()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    email VARCHAR,
    role VARCHAR,
    division_id UUID
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY 
    SELECT u.id, u.name, u.email, u.role, u.division_id
    FROM public.users u
    WHERE u.role IN ('admin', 'super_admin', 'sales', 'rep', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales');
END;
$$ LANGUAGE plpgsql;

-- 2. Update users table RLS to allow all staff to view each other
DROP POLICY IF EXISTS "Staff can view other staff" ON public.users;
CREATE POLICY "Staff can view other staff" ON public.users
FOR SELECT
USING (
  public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
  AND 
  role IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
);

-- 3. Update clients table RLS to include all staff roles
DROP POLICY IF EXISTS "Staff can read all clients" ON public.clients;
CREATE POLICY "Staff can read all clients" ON public.clients 
FOR SELECT USING (
    public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
);

DROP POLICY IF EXISTS "Admins and Sales can manage clients" ON public.clients;
CREATE POLICY "Admins and Sales can manage clients" ON public.clients 
FOR ALL USING (
    public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
);

-- 4. Update lead_purchases table RLS to include all staff roles
DROP POLICY IF EXISTS "Staff can view all purchases" ON public.lead_purchases;
CREATE POLICY "Staff can view all purchases" ON public.lead_purchases 
FOR SELECT USING (
    public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
);

-- 5. Update lead_notes table RLS for all staff roles
DROP POLICY IF EXISTS "Sales and Admins can read notes" ON public.lead_notes;
CREATE POLICY "Sales and Admins can read notes" ON public.lead_notes 
FOR SELECT USING (
    public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
);

DROP POLICY IF EXISTS "Sales and Admins can insert notes" ON public.lead_notes;
CREATE POLICY "Sales and Admins can insert notes" ON public.lead_notes 
FOR INSERT WITH CHECK (
    public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
);

-- 6. Update contractors and contractor_notes RLS
DROP POLICY IF EXISTS "Sales and Admins can manage contractors" ON public.contractors;
CREATE POLICY "Sales and Admins can manage contractors" ON public.contractors 
FOR ALL USING (
    public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
);

DROP POLICY IF EXISTS "Sales and Admins can manage contractor notes" ON public.contractor_notes;
CREATE POLICY "Sales and Admins can manage contractor notes" ON public.contractor_notes 
FOR ALL USING (
    public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales')
);

-- 7. Ensure leads table RLS is consistent (based on RLS_FIX.sql but ensuring all roles are covered)
DROP POLICY IF EXISTS "Sales can read all leads" ON public.leads;
CREATE POLICY "Sales can read all leads" ON public.leads 
FOR SELECT USING (
    public.get_auth_user_role() = 'super_admin'
    OR public.get_auth_user_role() = 'admin'
    OR (
        public.get_auth_user_role() = 'Residential Rep' 
        AND lead_type = 'residential' 
        AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL)
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Residential Sales' 
        AND lead_type = 'residential' 
        AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL)
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Commercial Sales' 
        AND lead_type = 'commercial' 
        AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL)
    )
    OR (
        public.get_auth_user_role() IN ('rep', 'growth_manager', 'sales') 
        AND (
            (is_private = false AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL))
            OR (is_private = true AND auth.uid() = assigned_to)
        )
    )
);

DROP POLICY IF EXISTS "Sales can update leads" ON public.leads;
CREATE POLICY "Sales can update leads" ON public.leads 
FOR UPDATE USING (
    public.get_auth_user_role() = 'super_admin'
    OR public.get_auth_user_role() = 'admin'
    OR (
        public.get_auth_user_role() = 'Residential Rep' 
        AND lead_type = 'residential' 
        AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL)
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Residential Sales' 
        AND lead_type = 'residential' 
        AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL)
        AND created_at >= '2026-06-13'
    )
    OR (
        public.get_auth_user_role() = 'Commercial Sales' 
        AND lead_type = 'commercial' 
        AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL)
    )
    OR (
        public.get_auth_user_role() IN ('rep', 'growth_manager', 'sales') 
        AND (
            (is_private = false AND (division_id = public.get_auth_user_division_id() OR division_id IS NULL))
            OR (is_private = true AND auth.uid() = assigned_to)
        )
    )
);
