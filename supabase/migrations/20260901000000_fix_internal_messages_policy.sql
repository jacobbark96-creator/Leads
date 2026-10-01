-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view messages" ON public.internal_messages;

-- Create updated select policy that allows super admins to see all group messages
CREATE POLICY "Users can view messages" ON public.internal_messages FOR SELECT USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    OR (group_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.internal_group_members WHERE group_id = public.internal_messages.group_id AND user_id = auth.uid())
        OR public.get_auth_user_role() = 'super_admin'
    ))
);
