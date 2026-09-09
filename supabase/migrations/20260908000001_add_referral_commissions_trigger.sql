-- ==============================================================================
-- Referral Commission Trigger Logic
-- ==============================================================================

-- Create a function to handle referral commissions when a lead is purchased
CREATE OR REPLACE FUNCTION process_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_source TEXT;
    v_partner_id UUID;
    v_parent_partner_id UUID;
    v_commission_exists BOOLEAN;
BEGIN
    -- 1. Check if the lead has already generated a commission
    SELECT EXISTS (
        SELECT 1 FROM public.referral_commissions 
        WHERE lead_id = NEW.lead_id
    ) INTO v_commission_exists;

    IF v_commission_exists THEN
        RETURN NEW; -- Commission already generated for this lead
    END IF;

    -- 2. Get the lead_source (partner_id string)
    SELECT lead_source INTO v_lead_source 
    FROM public.leads 
    WHERE id = NEW.lead_id;

    -- If no lead_source or doesn't start with REF-, exit early
    IF v_lead_source IS NULL OR v_lead_source NOT LIKE 'REF-%' THEN
        RETURN NEW;
    END IF;

    -- 3. Find the partner
    SELECT id, parent_partner_id INTO v_partner_id, v_parent_partner_id
    FROM public.referral_partners
    WHERE partner_id = v_lead_source;

    -- If partner found, generate commissions
    IF v_partner_id IS NOT NULL THEN
        -- Generate Direct Commission (£35)
        INSERT INTO public.referral_commissions (
            lead_id, partner_id, parent_partner_id, commission_type, amount, status, earned_at, due_at
        ) VALUES (
            NEW.lead_id, v_partner_id, NULL, 'direct', 35.00, 'Due', NOW(), NOW()
        );

        -- Generate Tier 2 Commission (£3.50) if they have a parent
        IF v_parent_partner_id IS NOT NULL THEN
            INSERT INTO public.referral_commissions (
                lead_id, partner_id, parent_partner_id, commission_type, amount, status, earned_at, due_at
            ) VALUES (
                NEW.lead_id, v_parent_partner_id, v_partner_id, 'tier2', 3.50, 'Due', NOW(), NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to lead_purchases table
DROP TRIGGER IF EXISTS trg_process_referral_commission ON public.lead_purchases;
CREATE TRIGGER trg_process_referral_commission
    AFTER INSERT ON public.lead_purchases
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_commission();
