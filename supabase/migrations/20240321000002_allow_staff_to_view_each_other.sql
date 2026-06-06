-- Allow staff to see other staff members
DROP POLICY IF EXISTS "Staff can view other staff" ON public.users;
CREATE POLICY "Staff can view other staff" ON public.users
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('admin', 'super_admin', 'rep', 'sales')
  )
  AND 
  role IN ('admin', 'super_admin', 'rep', 'sales')
);
