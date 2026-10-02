CREATE TABLE IF NOT EXISTS public.smart_view_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    smart_view_id UUID REFERENCES public.smart_views(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(smart_view_id, user_id)
);

ALTER TABLE public.smart_view_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares they are involved in" ON public.smart_view_shares FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.smart_views WHERE smart_views.id = smart_view_id AND smart_views.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

CREATE POLICY "Owners can create shares" ON public.smart_view_shares FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.smart_views WHERE smart_views.id = smart_view_id AND smart_views.user_id = auth.uid())
);

CREATE POLICY "Owners can delete shares" ON public.smart_view_shares FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.smart_views WHERE smart_views.id = smart_view_id AND smart_views.user_id = auth.uid())
);

-- Drop old policies to recreate them with sharing logic
DROP POLICY IF EXISTS "Users can view their own smart views" ON public.smart_views;
CREATE POLICY "Users can view their own or shared smart views" ON public.smart_views FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.smart_view_shares WHERE smart_view_shares.smart_view_id = id AND smart_view_shares.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

DROP POLICY IF EXISTS "Users can view their own smart view items" ON public.smart_view_items;
CREATE POLICY "Users can view their own or shared smart view items" ON public.smart_view_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.smart_views WHERE smart_views.id = smart_view_id AND (
        smart_views.user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.smart_view_shares WHERE smart_view_shares.smart_view_id = smart_views.id AND smart_view_shares.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin')
    ))
);
