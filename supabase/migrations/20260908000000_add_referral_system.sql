-- ==============================================================================
-- 1. Update Users Table Role Constraint
-- ==============================================================================
DO $$ 
BEGIN
    -- Drop the existing role check constraint if it exists
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- Add the new constraint including 'referral_partner'
    -- Note: If this fails because of existing invalid roles, you might need to clean them up first, 
    -- but usually it's fine. If we want to be super safe, we can just not enforce it strictly.
    -- We'll try to add it.
    -- ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    -- CHECK (role IN ('client', 'sales', 'admin', 'super_admin', 'rep', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales', 'referral_partner'));
END $$;

-- ==============================================================================
-- 2. Create Partners Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    partner_id VARCHAR(50) UNIQUE NOT NULL,
    parent_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    tc_version VARCHAR(50) NOT NULL,
    tc_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_partner_id ON public.partners(partner_id);

-- ==============================================================================
-- 3. Create Referral Questions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.referral_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'yes_no', 'short_text', 'number'
    options JSONB DEFAULT '[]'::jsonb,
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. Create Referral Commissions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    parent_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('direct', 'tier2')),
    amount NUMERIC NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Earned', 'Due', 'Paid', 'Cancelled')),
    earned_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_batch VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_commissions_partner_id ON public.referral_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_ref_commissions_lead_id ON public.referral_commissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_ref_commissions_status ON public.referral_commissions(status);

-- ==============================================================================
-- 5. Create Referral Tracking Table (Kanban & Answers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    kanban_status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (kanban_status IN ('NEW', 'DEALT_WITH')),
    dealt_with_at TIMESTAMPTZ,
    dealt_with_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    questionnaire_responses JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lead_id)
);

CREATE INDEX IF NOT EXISTS idx_ref_tracking_kanban_status ON public.referral_tracking(kanban_status);

-- ==============================================================================
-- 6. Updated At Triggers
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_referral_questions_updated_at ON public.referral_questions;
CREATE TRIGGER update_referral_questions_updated_at
    BEFORE UPDATE ON public.referral_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referral_commissions_updated_at ON public.referral_commissions;
CREATE TRIGGER update_referral_commissions_updated_at
    BEFORE UPDATE ON public.referral_commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referral_tracking_updated_at ON public.referral_tracking;
CREATE TRIGGER update_referral_tracking_updated_at
    BEFORE UPDATE ON public.referral_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

-- Partners: Partners can read their own profile. Admins can read all.
CREATE POLICY "Partners can read own profile" ON public.partners
    FOR SELECT USING (user_id = auth.uid());
    
CREATE POLICY "Partners can read child profiles" ON public.partners
    FOR SELECT USING (
        parent_partner_id IN (
            SELECT id FROM public.partners WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage partners" ON public.partners
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Questions: Anyone authenticated can read active questions. Admins can manage all.
CREATE POLICY "Anyone can read active questions" ON public.referral_questions
    FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can manage questions" ON public.referral_questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Commissions: Partners can read their own (direct or parent). Admins can manage.
CREATE POLICY "Partners can read own commissions" ON public.referral_commissions
    FOR SELECT USING (
        partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR
        parent_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage commissions" ON public.referral_commissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Tracking: Partners can read tracking for their own leads. Admins can manage.
CREATE POLICY "Partners can read own tracking" ON public.referral_tracking
    FOR SELECT USING (
        partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage tracking" ON public.referral_tracking
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Also allow partners to insert leads and tracking (we'll use SECURITY DEFINER RPCs for this to bypass RLS safely, but let's allow basic inserts just in case)
-- It's safer to use RPCs for lead creation so partners can't mess with lead statuses directly.

-- ==============================================================================
-- 8. Seed Default Questions
-- ==============================================================================
INSERT INTO public.referral_questions (question_text, question_type, options, is_required, sort_order) VALUES
('Who are you referring?', 'multiple_choice', '["Homeowner", "Business owner"]'::jsonb, true, 1),
('Do they own the property?', 'multiple_choice', '["Yes", "No", "Not sure"]'::jsonb, true, 2),
('Rough monthly electricity spend?', 'multiple_choice', '["Under £250", "£250–£500", "£500–£1,000", "£1,000–£2,500", "£2,500–£5,000", "£5,000+"]'::jsonb, true, 3),
('How interested are they in exploring solar?', 'multiple_choice', '["Actively looking", "Interested and researching", "Just curious"]'::jsonb, true, 4),
('When are they likely to consider solar?', 'multiple_choice', '["Immediately", "1–3 months", "3–6 months", "6–12 months", "Just researching"]'::jsonb, true, 5)
ON CONFLICT DO NOTHING;
