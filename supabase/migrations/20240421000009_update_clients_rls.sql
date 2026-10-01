-- Migration: Allow sales to create clients during onboarding
-- Description: Updates the "Admins can manage clients" policy to allow sales to insert clients.

DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;

CREATE POLICY "Admins and Sales can manage clients" ON public.clients 
    FOR ALL USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin')
    );
