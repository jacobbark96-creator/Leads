-- Update RLS policy for leads to allow partners to see their referred leads more reliably
DROP POLICY IF EXISTS "Partners can read referred leads" ON public.leads;

CREATE POLICY "Partners can read referred leads" ON public.leads
    FOR SELECT USING (
        id IN (
            SELECT lead_id FROM public.referral_tracking
            WHERE partner_id IN (
                SELECT id FROM public.partners WHERE user_id = auth.uid()
            )
        )
    );
