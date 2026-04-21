-- Create a SECURITY DEFINER function to get the current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_auth_user_role() 
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Recreate them using the security definer function
CREATE POLICY "Admins can read all users" ON public.users 
    FOR SELECT USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "Admins can manage users" ON public.users 
    FOR ALL USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );
