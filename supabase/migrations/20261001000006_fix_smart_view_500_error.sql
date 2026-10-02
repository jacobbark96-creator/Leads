-- Drop the recursive policies
DROP POLICY IF EXISTS "Users can view their own or shared smart views" ON public.smart_views;
DROP POLICY IF EXISTS "Users can view shares they are involved in" ON public.smart_view_shares;
DROP POLICY IF EXISTS "Owners can create shares" ON public.smart_view_shares;
DROP POLICY IF EXISTS "Owners can delete shares" ON public.smart_view_shares;
DROP POLICY IF EXISTS "Users can view their own or shared smart view items" ON public.smart_view_items;

-- Create secure helper functions to bypass RLS evaluation loops
CREATE OR REPLACE FUNCTION public.get_shared_smart_view_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT smart_view_id FROM smart_view_shares WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_owned_smart_view_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM smart_views WHERE user_id = auth.uid();
$$;

-- 1. Policies for smart_views
CREATE POLICY "Users can view their own or shared smart views" ON public.smart_views FOR SELECT USING (
    user_id = auth.uid() OR 
    id IN (SELECT public.get_shared_smart_view_ids()) OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

-- 2. Policies for smart_view_shares
CREATE POLICY "Users can view shares they are involved in" ON public.smart_view_shares FOR SELECT USING (
    user_id = auth.uid() OR 
    smart_view_id IN (SELECT public.get_owned_smart_view_ids()) OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

CREATE POLICY "Owners can create shares" ON public.smart_view_shares FOR INSERT WITH CHECK (
    smart_view_id IN (SELECT public.get_owned_smart_view_ids())
);

CREATE POLICY "Owners can delete shares" ON public.smart_view_shares FOR DELETE USING (
    smart_view_id IN (SELECT public.get_owned_smart_view_ids())
);

-- 3. Policies for smart_view_items
CREATE POLICY "Users can view their own or shared smart view items" ON public.smart_view_items FOR SELECT USING (
    smart_view_id IN (SELECT public.get_owned_smart_view_ids()) OR
    smart_view_id IN (SELECT public.get_shared_smart_view_ids()) OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);