-- Fix RLS for Partners Insert
CREATE POLICY "Partners can insert own profile" ON public.partners
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Partners can insert own tracking" ON public.referral_tracking
    FOR INSERT WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (id = auth.uid());
