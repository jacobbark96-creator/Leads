CREATE TABLE IF NOT EXISTS public.internal_group_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.internal_group_members (
    group_id UUID REFERENCES public.internal_group_chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.internal_group_chats(id) ON DELETE CASCADE;
ALTER TABLE public.internal_messages ALTER COLUMN receiver_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.internal_group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_group_members ENABLE ROW LEVEL SECURITY;

-- Policies for Group Chats
CREATE POLICY "Users can view groups they are members of" ON public.internal_group_chats FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.internal_group_members WHERE group_id = public.internal_group_chats.id AND user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
);

CREATE POLICY "Super admins can create groups" ON public.internal_group_chats FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
);

-- Policies for Group Members
CREATE POLICY "Users can view members of their groups" ON public.internal_group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.internal_group_members m WHERE m.group_id = public.internal_group_members.group_id AND m.user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
);

CREATE POLICY "Super admins can manage members" ON public.internal_group_members FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
);

-- Update internal_messages policy for groups
DROP POLICY IF EXISTS "Users can view messages sent to or from them" ON public.internal_messages;
CREATE POLICY "Users can view messages" ON public.internal_messages FOR SELECT USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.internal_group_members WHERE group_id = public.internal_messages.group_id AND user_id = auth.uid()))
);

-- Add realtime tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_group_members;