-- Fix recursion by using the get_auth_user_role function
-- This function is SECURITY DEFINER, which bypasses RLS for the users table during the check

-- 1. Drop the problematic policy I just added
DROP POLICY IF EXISTS "Staff can view other staff" ON public.users;

-- 2. Drop the old init policies that also had recursion
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- 3. Re-create clean, non-recursive policies
-- Use public.get_auth_user_role() which is defined in 20260522000000_define_auth_user_role.sql

-- Policy: Users can always read their own profile
CREATE POLICY "Users can read own data" ON public.users 
    FOR SELECT USING (auth.uid() = id);

-- Policy: Staff can view other staff members (needed for Internal Chat)
CREATE POLICY "Staff can view other staff" ON public.users
    FOR SELECT USING (
      public.get_auth_user_role() IN ('admin', 'super_admin', 'rep', 'sales')
      AND 
      role IN ('admin', 'super_admin', 'rep', 'sales')
    );

-- Policy: Admins can read all users
CREATE POLICY "Admins can read all users" ON public.users 
    FOR SELECT USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );

-- Policy: Admins can manage all users
CREATE POLICY "Admins can manage users" ON public.users 
    FOR ALL USING (
        public.get_auth_user_role() IN ('admin', 'super_admin')
    );
