-- Migration: Add assignments to leads and contractors, and function to get staff users
-- Description: Allows leads and contractors to be assigned to specific admin/sales users.

ALTER TABLE public.leads 
ADD COLUMN assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.contractors 
ADD COLUMN assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create a secure function to get staff users for the assignment dropdowns
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
    WHERE u.role IN ('admin', 'super_admin', 'sales')
    ORDER BY u.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users (so sales/admin can fetch the list)
GRANT EXECUTE ON FUNCTION public.get_staff_users() TO authenticated;
