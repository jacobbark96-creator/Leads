-- First, let's clean up the recursive policies
DROP POLICY IF EXISTS "Users can view shares they are involved in" ON public.smart_view_shares;
DROP POLICY IF EXISTS "Owners can create shares" ON public.smart_view_shares;
DROP POLICY IF EXISTS "Owners can delete shares" ON public.smart_view_shares;
DROP POLICY IF EXISTS "Users can view their own or shared smart views" ON public.smart_views;
DROP POLICY IF EXISTS "Users can view their own or shared smart view items" ON public.smart_view_items;

-- 1. Base table: smart_views
-- A user can see a smart view if they created it OR if their user_id exists in smart_view_shares for this view
CREATE POLICY "Users can view their own or shared smart views" ON public.smart_views FOR SELECT USING (
    user_id = auth.uid() OR 
    id IN (SELECT smart_view_id FROM public.smart_view_shares WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

-- 2. Sharing table: smart_view_shares
-- A user can see shares if they are the recipient, or if they own the parent smart_view
CREATE POLICY "Users can view shares they are involved in" ON public.smart_view_shares FOR SELECT USING (
    user_id = auth.uid() OR 
    smart_view_id IN (SELECT id FROM public.smart_views WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

-- Only owners of the smart view can insert/delete shares
CREATE POLICY "Owners can create shares" ON public.smart_view_shares FOR INSERT WITH CHECK (
    smart_view_id IN (SELECT id FROM public.smart_views WHERE user_id = auth.uid())
);

CREATE POLICY "Owners can delete shares" ON public.smart_view_shares FOR DELETE USING (
    smart_view_id IN (SELECT id FROM public.smart_views WHERE user_id = auth.uid())
);

-- 3. Items table: smart_view_items
-- A user can see items if they can see the parent smart view
CREATE POLICY "Users can view their own or shared smart view items" ON public.smart_view_items FOR SELECT USING (
    smart_view_id IN (
        SELECT id FROM public.smart_views WHERE user_id = auth.uid()
        UNION
        SELECT smart_view_id FROM public.smart_view_shares WHERE user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);
