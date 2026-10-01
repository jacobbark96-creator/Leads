-- Add columns for Growth Manager pipeline and privacy
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS gm_pipeline_status TEXT CHECK (gm_pipeline_status IN ('Callbacks', 'To Sign', 'Signed Up')),
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Update RLS policies for leads to handle private leads
-- First, drop the existing policy if it exists (the one we might have added or modified)
DROP POLICY IF EXISTS "Growth Manager private leads" ON public.leads;

-- Policy: Super admins can see everything
-- Policy: Growth Managers can see their private leads
-- Policy: Regular staff can see non-private leads if they have access

-- We need to redefine the "Sales can read all leads" policy to exclude private leads unless they are the owner or super admin.
DROP POLICY IF EXISTS "Sales can read all leads" ON public.leads;

CREATE POLICY "Sales can read all leads" ON public.leads 
FOR SELECT USING (
    (public.get_auth_user_role() IN ('sales', 'rep', 'growth_manager') AND is_private = false)
    OR (is_private = true AND (auth.uid() = assigned_to OR public.get_auth_user_role() = 'super_admin'))
    OR (public.get_auth_user_role() = 'admin')
);

-- Also update the update policy
DROP POLICY IF EXISTS "Sales can update leads" ON public.leads;
CREATE POLICY "Sales can update leads" ON public.leads 
FOR UPDATE USING (
    (public.get_auth_user_role() IN ('sales', 'rep', 'growth_manager') AND is_private = false)
    OR (is_private = true AND (auth.uid() = assigned_to OR public.get_auth_user_role() = 'super_admin'))
    OR (public.get_auth_user_role() = 'admin')
);
