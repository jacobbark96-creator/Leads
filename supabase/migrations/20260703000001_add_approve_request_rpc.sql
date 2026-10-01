-- Create an atomic RPC function for approving lead purchase requests
CREATE OR REPLACE FUNCTION public.approve_purchase_request(
  p_purchase_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase RECORD;
  v_parent_client RECORD;
  v_parent_user RECORD;
  v_child_client RECORD;
  v_lead RECORD;
  v_approver_id UUID;
  v_new_balance NUMERIC;
  v_invoice_id UUID;
BEGIN
  v_approver_id := auth.uid();

  -- 1. Get the purchase request and lock it
  SELECT * INTO v_purchase FROM public.lead_purchases WHERE id = p_purchase_id FOR UPDATE;
  
  IF v_purchase IS NULL OR v_purchase.status != 'permission_pending' THEN
    RAISE EXCEPTION 'Purchase request not found or not pending';
  END IF;

  -- 2. Verify the approver is the parent of the child who requested it
  SELECT * INTO v_child_client FROM public.clients WHERE id = v_purchase.client_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_child_client.user_id AND parent_id = v_approver_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized to approve this request';
  END IF;

  -- 3. Get parent client and user info for billing
  SELECT * INTO v_parent_client FROM public.clients WHERE user_id = v_approver_id FOR UPDATE;
  SELECT * INTO v_parent_user FROM public.users WHERE id = v_approver_id FOR UPDATE;
  
  IF v_parent_client IS NULL OR v_parent_user IS NULL THEN
    RAISE EXCEPTION 'Parent account profiles not found';
  END IF;

  -- 4. Lock the lead
  SELECT * INTO v_lead FROM public.leads WHERE id = v_purchase.lead_id FOR UPDATE;

  -- 5. Billing Logic (Bills the PARENT)
  IF v_parent_user.trade_account_enabled THEN
    -- Check if purchase fits within remaining limit
    IF (v_parent_user.current_trade_usage + v_purchase.price_paid) > v_parent_user.trade_limit_setting THEN
      RAISE EXCEPTION 'Trade limit exceeded for parent account. Remaining limit: £%', (v_parent_user.trade_limit_setting - v_parent_user.current_trade_usage);
    END IF;

    -- Record usage on the parent profile
    UPDATE public.users 
    SET current_trade_usage = current_trade_usage + v_purchase.price_paid 
    WHERE id = v_approver_id;

    -- Handle Draft Invoice for Parent
    SELECT id INTO v_invoice_id 
    FROM public.invoices 
    WHERE user_id = v_approver_id AND status = 'draft' 
    ORDER BY created_at DESC
    LIMIT 1 FOR UPDATE;

    IF v_invoice_id IS NULL THEN
      INSERT INTO public.invoices (user_id, status, total_amount)
      VALUES (v_approver_id, 'draft', v_purchase.price_paid)
      RETURNING id INTO v_invoice_id;
    ELSE
      UPDATE public.invoices 
      SET total_amount = total_amount + v_purchase.price_paid 
      WHERE id = v_invoice_id;
    END IF;
  ELSIF v_parent_client.credit_balance >= v_purchase.price_paid THEN
    -- Deduct from parent credit
    UPDATE public.clients 
    SET credit_balance = credit_balance - v_purchase.price_paid 
    WHERE id = v_parent_client.id;
  ELSE
    RAISE EXCEPTION 'Parent account has insufficient credit or Flex limit to approve this purchase';
  END IF;

  -- 6. Update the purchase record (It remains assigned to the child)
  UPDATE public.lead_purchases 
  SET 
    status = 'new',
    purchased_at = NOW(),
    invoice_id = v_invoice_id
  WHERE id = p_purchase_id;

  -- 7. Update the lead state
  IF v_purchase.purchase_type = 'exclusive' THEN
    UPDATE public.leads
    SET 
      is_exclusive_sold = true,
      purchase_count = purchase_count + 1,
      status = 'sold',
      client_id = v_purchase.client_id, -- Keep child as the assigned client
      purchase_date = NOW()
    WHERE id = v_purchase.lead_id;
  ELSE
    UPDATE public.leads
    SET 
      purchase_count = purchase_count + 1,
      status = CASE WHEN purchase_count + 1 >= max_shares THEN 'sold' ELSE status END,
      purchase_date = CASE WHEN purchase_count + 1 >= max_shares THEN NOW() ELSE purchase_date END
    WHERE id = v_purchase.lead_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
