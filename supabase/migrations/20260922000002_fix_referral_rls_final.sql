-- Comprehensive RLS fix for Referral System
-- Ensure partners can read their own records and associated leads/commissions

-- 1. Partners table
DROP POLICY IF EXISTS "Partners can read own profile" ON public.partners;
CREATE POLICY "Partners can read own profile" ON public.partners
    FOR SELECT USING (user_id = auth.uid());

-- 2. Referral Tracking table
DROP POLICY IF EXISTS "Partners can read own tracking" ON public.referral_tracking;
CREATE POLICY "Partners can read own tracking" ON public.referral_tracking
    FOR SELECT USING (
        partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );

-- 3. Leads table
DROP POLICY IF EXISTS "Partners can read referred leads" ON public.leads;
CREATE POLICY "Partners can read referred leads" ON public.leads
    FOR SELECT USING (
        id IN (
            SELECT lead_id FROM public.referral_tracking
            WHERE partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
        )
    );

-- 4. Commissions table
DROP POLICY IF EXISTS "Partners can read own commissions" ON public.referral_commissions;
CREATE POLICY "Partners can read own commissions" ON public.referral_commissions
    FOR SELECT USING (
        partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
        OR 
        parent_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
