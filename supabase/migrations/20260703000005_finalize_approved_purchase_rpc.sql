-- Create an atomic RPC function for finalizing a lead purchase that was requested by a child
-- This handles both direct credit/flex approvals and Stripe-confirmed approvals
CREATE OR REPLACE FUNCTION public.finalize_approved_purchase(
  p_purchase_id UUID,
  p_purchase_type TEXT,
  p_price_paid NUMERIC,
  p_credit_used NUMERIC,
  p_use_trade_account BOOLEAN DEFAULT false,
  p_parent_user_id UUID DEFAULT NULL -- Optional, used for webhook/service-role calls
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
  v_invoice_id UUID;
BEGIN
  -- Determine who is approving/paying
  v_approver_id := COALESCE(p_parent_user_id, auth.uid());
  
  IF v_approver_id IS NULL THEN
    RAISE EXCEPTION 'No approver ID provided or authenticated';
  END IF;

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
  IF p_use_trade_account THEN
    -- Check if purchase fits within remaining limit
    IF (v_parent_user.current_trade_usage + p_price_paid) > v_parent_user.trade_limit_setting THEN
      RAISE EXCEPTION 'Trade limit exceeded for parent account. Remaining limit: £%', (v_parent_user.trade_limit_setting - v_parent_user.current_trade_usage);
    END IF;

    -- Record usage on the parent profile
    UPDATE public.users 
    SET current_trade_usage = current_trade_usage + p_price_paid 
    WHERE id = v_approver_id;

    -- Handle Draft Invoice for Parent
    SELECT id INTO v_invoice_id 
    FROM public.invoices 
    WHERE user_id = v_approver_id AND status = 'draft' 
    ORDER BY created_at DESC
    LIMIT 1 FOR UPDATE;

    IF v_invoice_id IS NULL THEN
      INSERT INTO public.invoices (user_id, status, total_amount)
      VALUES (v_approver_id, 'draft', p_price_paid)
      RETURNING id INTO v_invoice_id;
    ELSE
      UPDATE public.invoices 
      SET total_amount = total_amount + p_price_paid 
      WHERE id = v_invoice_id;
    END IF;
  ELSIF p_credit_used > 0 THEN
    -- Deduct from parent credit
    IF v_parent_client.credit_balance < p_credit_used THEN
       RAISE EXCEPTION 'Insufficient parent credit balance';
    END IF;

    UPDATE public.clients 
    SET credit_balance = credit_balance - p_credit_used 
    WHERE id = v_parent_client.id;
  END IF;

  -- 6. Update the purchase record (It remains assigned to the child)
  UPDATE public.lead_purchases 
  SET 
    status = 'new',
    purchased_at = NOW(),
    purchase_type = p_purchase_type,
    price_paid = p_price_paid,
    invoice_id = v_invoice_id
  WHERE id = p_purchase_id;

  -- 7. Update the lead state
  IF p_purchase_type = 'exclusive' THEN
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

  -- 8. Create a notification for the child account
  INSERT INTO public.notifications (user_id, title, body, data)
  VALUES (
    v_child_client.user_id,
    'Lead Purchase Approved',
    'Your manager has approved and purchased the lead in ' || public.extract_town(v_lead.location) || ' for you.',
    jsonb_build_object(
      'type', 'approval',
      'purchase_id', p_purchase_id, 
      'lead_id', v_purchase.lead_id
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
