-- Create an atomic RPC function for reversing lead purchases with optional refund
CREATE OR REPLACE FUNCTION public.reverse_lead_purchase(
  p_lead_id UUID,
  p_refund_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_client_id UUID;
BEGIN
  -- 1. Get lead info and lock
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  
  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- 2. Find the client to refund
  -- First try the client_id on the lead record
  v_client_id := v_lead.client_id;
  
  -- If not found, look at the most recent purchase record
  IF v_client_id IS NULL THEN
    SELECT client_id INTO v_client_id 
    FROM public.lead_purchases 
    WHERE lead_id = p_lead_id 
    ORDER BY purchased_at DESC 
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'No purchaser found for this lead to refund';
  END IF;

  -- 3. Reset lead status
  UPDATE public.leads
  SET 
    status = 'qualified',
    client_id = NULL,
    purchase_date = NULL,
    is_exclusive_sold = false,
    purchase_count = GREATEST(0, purchase_count - 1)
  WHERE id = p_lead_id;

  -- 4. Apply refund to client's credit balance if requested
  IF p_refund_amount > 0 THEN
    UPDATE public.clients 
    SET credit_balance = credit_balance + p_refund_amount 
    WHERE id = v_client_id;
  END IF;

  -- 5. Remove the purchase record(s) for this lead and client
  DELETE FROM public.lead_purchases 
  WHERE lead_id = p_lead_id AND client_id = v_client_id;

  RETURN jsonb_build_object(
    'success', true, 
    'client_id', v_client_id,
    'refund_applied', p_refund_amount
  );
END;
$$;
