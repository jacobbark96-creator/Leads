CREATE POLICY "Admins can view all sms" ON public.sms_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );
