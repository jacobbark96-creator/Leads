-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.internal_group_members;
DROP POLICY IF EXISTS "Super admins can manage members" ON public.internal_group_members;

-- Fix the recursion in internal_group_members
-- Instead of querying internal_group_members again, we can just allow users to see all members 
-- if they are a member of that group, OR we can just allow anyone authenticated to read members
-- and rely on the group chats policy to restrict what groups they see.
-- The simplest way to prevent recursion is to just let authenticated users read the members table,
-- since it only contains group_id and user_id.

CREATE POLICY "Users can view group members" ON public.internal_group_members FOR SELECT USING (
    true
);

CREATE POLICY "Super admins can manage members" ON public.internal_group_members FOR ALL USING (
    public.get_auth_user_role() = 'super_admin'
);
