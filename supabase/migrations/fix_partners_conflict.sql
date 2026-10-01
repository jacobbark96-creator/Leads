-- 1. Rename existing marketing-related partners tables
ALTER TABLE IF EXISTS public.partners RENAME TO marketing_partners;
ALTER TABLE IF EXISTS public.partner_clicks RENAME TO marketing_partner_clicks;

-- 2. Update the click tracking function
CREATE OR REPLACE FUNCTION track_partner_click(p_partner_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.marketing_partner_clicks (partner_id, user_id)
    VALUES (p_partner_id, p_user_id);
    
    UPDATE public.marketing_partners
    SET clicks = clicks + 1
    WHERE id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the new partners table for the Referral System
CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    partner_id TEXT NOT NULL UNIQUE,
    parent_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    tc_version TEXT NOT NULL,
    tc_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS and create policies for the new partners table
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral partner profile"
    ON public.partners FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to referral partners"
    ON public.partners FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );

-- 5. Create referral_tracking table
CREATE TABLE public.referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    kanban_status TEXT NOT NULL DEFAULT 'NEW',
    questionnaire_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    dealt_with_at TIMESTAMPTZ,
    dealt_with_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own referral tracking"
    ON public.referral_tracking FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.partners
            WHERE partners.id = referral_tracking.partner_id
            AND partners.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins have full access to referral tracking"
    ON public.referral_tracking FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );

-- 6. Create referral_commissions table
CREATE TABLE public.referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    parent_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    lead_sale_value NUMERIC,
    commission_type TEXT NOT NULL, -- 'direct' or 'parent'
    commission_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'earned', 'due', 'paid', 'cancelled'
    earned_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_batch TEXT,
    paid_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own commissions"
    ON public.referral_commissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.partners
            WHERE partners.id = referral_commissions.partner_id
            AND partners.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins have full access to commissions"
    ON public.referral_commissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );

-- 7. Create referral_questions table
CREATE TABLE public.referral_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL, -- 'multiple_choice', 'yes_no', 'short_text', 'dropdown', etc.
    options JSONB, -- Array of strings for multiple choice
    is_required BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active questions"
    ON public.referral_questions FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins have full access to questions"
    ON public.referral_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );
