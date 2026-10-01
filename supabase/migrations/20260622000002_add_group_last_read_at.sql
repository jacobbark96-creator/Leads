ALTER TABLE public.internal_group_members
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE;

DROP POLICY IF EXISTS "Users can update their own group read state" ON public.internal_group_members;

CREATE POLICY "Users can update their own group read state"
ON public.internal_group_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_internal_group_members_user_group_read
ON public.internal_group_members(user_id, group_id, last_read_at);
