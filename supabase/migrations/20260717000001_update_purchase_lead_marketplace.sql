-- Updated purchase_lead RPC to ensure leads are removed from the marketplace (is_marketed = false)
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
  v_billing_client RECORD;
  v_billing_user RECORD;
  v_new_balance NUMERIC;
  v_full_price NUMERIC;
  v_invoice_id UUID;
  v_purchase_id UUID;
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

  -- 3. Identify Billing Entity
  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id FOR UPDATE;
  
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = v_client.user_id FOR UPDATE;
  
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- If this is a child account, we bill the parent
  IF v_user.parent_id IS NOT NULL THEN
    SELECT * INTO v_billing_user FROM public.users WHERE id = v_user.parent_id FOR UPDATE;
    SELECT * INTO v_billing_client FROM public.clients WHERE user_id = v_user.parent_id FOR UPDATE;
    
    IF v_billing_client IS NULL OR v_billing_user IS NULL THEN
      RAISE EXCEPTION 'Parent billing profile not found';
    END IF;
  ELSE
    v_billing_user := v_user;
    v_billing_client := v_client;
  END IF;

  -- 4. Handle Payment logic (Deduct from Billing Entity)
  v_full_price := p_price_paid + p_credit_used;

  -- Deduct credit from billing client balance first
  IF p_credit_used > 0 THEN
    IF v_billing_client.credit_balance < p_credit_used THEN
      RAISE EXCEPTION 'Insufficient credit balance. Current: %, Required: %', v_billing_client.credit_balance, p_credit_used;
    END IF;
    
    v_new_balance := v_billing_client.credit_balance - p_credit_used;
    UPDATE public.clients SET credit_balance = v_new_balance WHERE id = v_billing_client.id;
  END IF;

  IF p_use_trade_account THEN
    -- Check if trade account is enabled for the billing user
    IF NOT COALESCE(v_billing_user.trade_account_enabled, false) THEN
      RAISE EXCEPTION 'Trade account is not enabled for the billing account';
    END IF;

    -- Check if purchase fits within remaining limit
    IF (COALESCE(v_billing_user.current_trade_usage, 0) + p_price_paid) > COALESCE(v_billing_user.trade_limit_setting, 0) THEN
      RAISE EXCEPTION 'Trade limit exceeded. Remaining limit is £%', (COALESCE(v_billing_user.trade_limit_setting, 0) - COALESCE(v_billing_user.current_trade_usage, 0));
    END IF;

    -- Record usage on the billing user profile
    UPDATE public.users 
    SET current_trade_usage = COALESCE(current_trade_usage, 0) + p_price_paid 
    WHERE id = v_billing_user.id;

    -- Handle Draft Invoice for the billing user
    SELECT id INTO v_invoice_id 
    FROM public.invoices 
    WHERE user_id = v_billing_user.id AND status = 'draft' 
    ORDER BY created_at DESC
    LIMIT 1 FOR UPDATE;

    IF v_invoice_id IS NULL THEN
      INSERT INTO public.invoices (user_id, status, total_amount)
      VALUES (v_billing_user.id, 'draft', p_price_paid)
      RETURNING id INTO v_invoice_id;
    ELSE
      UPDATE public.invoices 
      SET total_amount = total_amount + p_price_paid 
      WHERE id = v_invoice_id;
    END IF;

  END IF;

  -- 5. Record the purchase (Assigned to the requester/child, but potentially linked to parent invoice)
  INSERT INTO public.lead_purchases (lead_id, client_id, purchase_type, price_paid, credit_used, purchased_at, invoice_id)
  VALUES (p_lead_id, p_client_id, p_purchase_type, p_price_paid, p_credit_used, NOW(), v_invoice_id)
  RETURNING id INTO v_purchase_id;

  -- 6. Update the lead state
  IF p_purchase_type = 'exclusive' THEN
    UPDATE public.leads
    SET 
      is_exclusive_sold = true,
      purchase_count = purchase_count + 1,
      status = 'sold',
      is_marketed = false, -- FIX: REMOVE FROM MARKETPLACE
      client_id = p_client_id, -- Assigned to the child
      purchase_date = NOW()
    WHERE id = p_lead_id;
  ELSE
    -- Share purchase
    UPDATE public.leads
    SET 
      purchase_count = purchase_count + 1,
      status = CASE WHEN purchase_count + 1 >= max_shares THEN 'sold' ELSE status END,
      is_marketed = CASE WHEN purchase_count + 1 >= max_shares THEN false ELSE is_marketed END, -- FIX: REMOVE FROM MARKETPLACE
      purchase_date = NOW()
    WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'purchase_id', v_purchase_id, 
    'invoice_id', v_invoice_id,
    'new_balance', v_new_balance
  );
END;
$$;