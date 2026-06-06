CREATE POLICY "Users can view their own sms" ON public.sms_messages
    FOR ALL USING (
        user_id = auth.uid()
    );
