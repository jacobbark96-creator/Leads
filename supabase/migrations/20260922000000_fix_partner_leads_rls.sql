-- Allow partners to read leads that are linked to them in referral_tracking
CREATE POLICY "Partners can read referred leads" ON public.leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.referral_tracking
            JOIN public.partners ON referral_tracking.partner_id = partners.id
            WHERE referral_tracking.lead_id = public.leads.id
            AND partners.user_id = auth.uid()
        )
    );
