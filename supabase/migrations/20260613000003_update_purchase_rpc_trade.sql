-- Update purchase_lead RPC to support trade accounts
CREATE OR REPLACE FUNCTION public.purchase_lead(
  p_lead_id UUID,
  p_client_id UUID,
  p_purchase_type VARCHAR(20),
  p_price_paid NUMERIC,
  p_credit_used NUMERIC,
  p_use_trade_account BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_client RECORD;
  v_user RECORD;
  v_new_balance NUMERIC;
  v_total_price NUMERIC;
BEGIN
  -- 1. Lock the lead row for update to prevent concurrent purchases
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  
  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- 2. Validate purchase is allowed
  IF v_lead.is_exclusive_sold THEN
    RAISE EXCEPTION 'Lead has already been sold exclusively';
  END IF;

  IF v_lead.purchase_count >= v_lead.max_shares THEN
    RAISE EXCEPTION 'Lead has reached maximum share purchases';
  END IF;

  IF p_purchase_type = 'exclusive' AND v_lead.purchase_count > 0 THEN
    RAISE EXCEPTION 'Lead has already been purchased as a share, cannot be bought exclusively';
  END IF;

  -- 3. Lock client and user
  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id FOR UPDATE;
  SELECT * INTO v_user FROM public.users WHERE id = v_client.user_id FOR UPDATE;

  -- 4. Handle Payment logic
  v_total_price := p_price_paid + p_credit_used;

  IF p_use_trade_account THEN
    -- Check if trade account is enabled for this user
    IF NOT v_user.trade_account_enabled THEN
      RAISE EXCEPTION 'Trade account is not enabled for this user';
    END IF;

    -- Check if purchase fits within remaining limit
    IF (v_user.current_trade_usage + v_total_price) > v_user.trade_limit_setting THEN
      RAISE EXCEPTION 'Trade limit exceeded. Your remaining limit is £%', (v_user.trade_limit_setting - v_user.current_trade_usage);
    END IF;

    -- Record usage on the user profile
    UPDATE public.users 
    SET current_trade_usage = current_trade_usage + v_total_price 
    WHERE id = v_user.id;
  ELSE
    -- Normal credit deduction
    IF p_credit_used > 0 THEN
      v_new_balance := GREATEST(0, COALESCE(v_client.credit_balance, 0) - p_credit_used);
      UPDATE public.clients SET credit_balance = v_new_balance WHERE id = p_client_id;
    END IF;
  END IF;

  -- 5. Record the purchase
  INSERT INTO public.lead_purchases (lead_id, client_id, purchase_type, price_paid, purchased_at)
  VALUES (p_lead_id, p_client_id, p_purchase_type, p_price_paid, NOW());

  -- 6. Update the lead state
  IF p_purchase_type = 'exclusive' THEN
    UPDATE public.leads
    SET 
      is_exclusive_sold = true,
      purchase_count = purchase_count + 1,
      status = 'sold',
      client_id = p_client_id, -- legacy fallback
      purchase_date = NOW()
    WHERE id = p_lead_id;
  ELSE
    -- Share purchase
    UPDATE public.leads
    SET 
      purchase_count = purchase_count + 1,
      status = CASE WHEN purchase_count + 1 >= max_shares THEN 'sold' ELSE status END,
      purchase_date = NOW()
    WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
