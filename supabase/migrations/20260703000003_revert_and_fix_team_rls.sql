-- Revert RLS policies to original state to restore staff access
DROP POLICY IF EXISTS "Users can read own data and team members" ON public.users;
CREATE POLICY "Users can read own data" ON public.users 
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Clients can read own profile and team members" ON public.clients;
CREATE POLICY "Clients can read own profile" ON public.clients 
    FOR SELECT USING (user_id = auth.uid());

-- Add Team hierarchy visibility as ADDITIONAL policies instead of replacements
-- This ensures we don't break existing staff/admin access
CREATE POLICY "Parents can read child user data" ON public.users 
    FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Children can read parent user data" ON public.users 
    FOR SELECT USING (id IN (SELECT parent_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Parents can read child client profiles" ON public.clients 
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE parent_id = auth.uid()));

CREATE POLICY "Children can read parent client profiles" ON public.clients 
    FOR SELECT USING (user_id IN (SELECT parent_id FROM public.users WHERE id = auth.uid()));
