-- Drop and recreate get_staff_users function to include new roles and division_id
DROP FUNCTION IF EXISTS public.get_staff_users();

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
