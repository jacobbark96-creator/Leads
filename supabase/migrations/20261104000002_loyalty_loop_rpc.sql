-- Function to process loyalty loop increments (to be called after a successful purchase)
CREATE OR REPLACE FUNCTION process_installer_loyalty(p_installer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_installers_record RECORD;
    v_new_paid_count INTEGER;
    v_free_credits INTEGER;
    v_streak_start TIMESTAMP WITH TIME ZONE;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Fetch current loyalty state
    SELECT paid_leads_count, free_credits_available, streak_start_date 
    INTO v_installers_record 
    FROM public.installers 
    WHERE id = p_installer_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_new_paid_count := COALESCE(v_installers_record.paid_leads_count, 0);
    v_free_credits := COALESCE(v_installers_record.free_credits_available, 0);
    v_streak_start := v_installers_record.streak_start_date;

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

    -- Update the installer record
    UPDATE public.installers 
    SET 
        paid_leads_count = v_new_paid_count,
        free_credits_available = v_free_credits,
        streak_start_date = v_streak_start
    WHERE id = p_installer_id;
END;
$$;
