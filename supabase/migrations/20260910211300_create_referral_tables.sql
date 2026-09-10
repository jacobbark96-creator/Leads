-- Create the referral_partners table
CREATE TABLE IF NOT EXISTS public.referral_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    partner_id TEXT NOT NULL UNIQUE,
    parent_partner_id UUID REFERENCES public.referral_partners(id) ON DELETE SET NULL,
    tc_version TEXT NOT NULL,
    tc_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own referral partner profile"
    ON public.referral_partners FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to referral partners"
    ON public.referral_partners FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );

-- Create referral_tracking table
CREATE TABLE IF NOT EXISTS public.referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
    kanban_status TEXT NOT NULL DEFAULT 'NEW',
    questionnaire_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    dealt_with_at TIMESTAMPTZ,
    dealt_with_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Partners can view their own referral tracking"
    ON public.referral_tracking FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.referral_partners
            WHERE referral_partners.id = referral_tracking.partner_id
            AND referral_partners.user_id = auth.uid()
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

-- Create referral_commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
    parent_partner_id UUID REFERENCES public.referral_partners(id) ON DELETE SET NULL,
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

-- Enable RLS
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Partners can view their own commissions"
    ON public.referral_commissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.referral_partners
            WHERE referral_partners.id = referral_commissions.partner_id
            AND referral_partners.user_id = auth.uid()
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

-- Create dynamic referral_questions table
CREATE TABLE IF NOT EXISTS public.referral_questions (
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

-- Enable RLS
ALTER TABLE public.referral_questions ENABLE ROW LEVEL SECURITY;

-- Create policies
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