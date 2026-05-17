-- Drop existing policies
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.internal_group_chats;
DROP POLICY IF EXISTS "Super admins can create groups" ON public.internal_group_chats;
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.internal_group_members;
DROP POLICY IF EXISTS "Super admins can manage members" ON public.internal_group_members;

-- Policies for Group Chats
CREATE POLICY "Users can view groups they are members of" ON public.internal_group_chats FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.internal_group_members WHERE group_id = public.internal_group_chats.id AND user_id = auth.uid())
    OR public.get_auth_user_role() = 'super_admin'
);

CREATE POLICY "Super admins can create groups" ON public.internal_group_chats FOR INSERT WITH CHECK (
    public.get_auth_user_role() = 'super_admin'
);

-- Policies for Group Members
CREATE POLICY "Users can view members of their groups" ON public.internal_group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.internal_group_members m WHERE m.group_id = public.internal_group_members.group_id AND m.user_id = auth.uid())
    OR public.get_auth_user_role() = 'super_admin'
);

CREATE POLICY "Super admins can manage members" ON public.internal_group_members FOR ALL USING (
    public.get_auth_user_role() = 'super_admin'
);
