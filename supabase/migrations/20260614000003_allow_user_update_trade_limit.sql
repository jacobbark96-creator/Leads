-- Allow users to update their own trade limit setting
CREATE POLICY "Users can update own trade limit" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
