-- Move tracking columns from installers to clients table
ALTER TABLE public.installers 
DROP COLUMN IF EXISTS paid_leads_count,
DROP COLUMN IF EXISTS free_credits_available,
DROP COLUMN IF EXISTS streak_start_date;

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS paid_leads_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_credits_available INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_start_date TIMESTAMP WITH TIME ZONE;

-- Update the RPC to use clients instead
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
    -- Fetch current loyalty state
    SELECT paid_leads_count, free_credits_available, streak_start_date 
    INTO v_clients_record 
    FROM public.clients 
    WHERE id = p_client_id;

    IF NOT FOUND THEN
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

-- Update the trigger
CREATE OR REPLACE FUNCTION trg_loyalty_on_lead_sold()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to sold and there is a client_id attached (we need to know the client buying it)
    IF NEW.status = 'sold' AND OLD.status IS DISTINCT FROM 'sold' AND NEW.client_id IS NOT NULL THEN
        -- Check if price is > 0 (to ignore claiming a free lead itself)
        IF COALESCE(NEW.price, 0) > 0 OR COALESCE(NEW.exclusive_price, 0) > 0 THEN
            PERFORM process_installer_loyalty(NEW.client_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

