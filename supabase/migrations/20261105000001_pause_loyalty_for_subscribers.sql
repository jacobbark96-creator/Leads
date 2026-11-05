-- Update the RPC to check subscription tier and pause loyalty loop if active
CREATE OR REPLACE FUNCTION process_installer_loyalty(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clients_record RECORD;
    v_new_paid_count INTEGER;
    v_free_credits INTEGER;
    v_streak_start TIMESTAMP WITH TIME ZONE;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Fetch current loyalty state and subscription info
    SELECT paid_leads_count, free_credits_available, streak_start_date, COALESCE(subscription_tier, 0) as sub_tier
    INTO v_clients_record 
    FROM public.clients 
    WHERE id = p_client_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- PAUSE LOGIC: If the user is an active subscriber, do not process gamification
    IF v_clients_record.sub_tier > 0 THEN
        RETURN;
    END IF;

    v_new_paid_count := COALESCE(v_clients_record.paid_leads_count, 0);
    v_free_credits := COALESCE(v_clients_record.free_credits_available, 0);
    v_streak_start := v_clients_record.streak_start_date;

    -- If streak is older than 45 days, reset the count to 0 and set start date to now
    IF v_streak_start IS NOT NULL AND v_now > v_streak_start + INTERVAL '45 days' THEN
        v_new_paid_count := 0;
        v_streak_start := v_now;
    END IF;

    -- If no streak start date exists, set it to now
    IF v_streak_start IS NULL THEN
        v_streak_start := v_now;
    END IF;

    -- Increment paid count
    v_new_paid_count := v_new_paid_count + 1;

    -- Check if they hit the 3-lead milestone
    IF v_new_paid_count >= 3 THEN
        -- Add 1 free credit
        v_free_credits := v_free_credits + 1;
        -- Reset count to 0 and reset the streak start date
        v_new_paid_count := 0;
        v_streak_start := v_now;
    END IF;

    -- Update the client record
    UPDATE public.clients 
    SET 
        paid_leads_count = v_new_paid_count,
        free_credits_available = v_free_credits,
        streak_start_date = v_streak_start
    WHERE id = p_client_id;
END;
$$;