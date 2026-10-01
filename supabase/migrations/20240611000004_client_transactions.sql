-- Create client_transactions table to track all financial movements
CREATE TABLE IF NOT EXISTS public.client_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('topup', 'lead_purchase', 'refund', 'adjustment')),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_client_transactions_client_id ON public.client_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_transactions_created_at ON public.client_transactions(created_at);

-- Enable RLS
ALTER TABLE public.client_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clients can view their own transactions" ON public.client_transactions
    FOR SELECT USING (
        client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Staff can view all transactions" ON public.client_transactions
    FOR SELECT USING (
        public.get_auth_user_role() IN ('sales', 'admin', 'super_admin', 'growth_manager', 'rep')
    );

-- Update purchase_lead RPC to log the transaction
CREATE OR REPLACE FUNCTION public.purchase_lead(
  p_lead_id UUID,
  p_client_id UUID,
  p_purchase_type VARCHAR(20),
  p_price_paid NUMERIC,
  p_credit_used NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_client RECORD;
  v_new_balance NUMERIC;
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

  -- 3. Lock client to deduct credit
  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id FOR UPDATE;
  
  IF p_credit_used > 0 THEN
    v_new_balance := GREATEST(0, COALESCE(v_client.credit_balance, 0) - p_credit_used);
    UPDATE public.clients SET credit_balance = v_new_balance WHERE id = p_client_id;
    
    -- Record credit transaction
    INSERT INTO public.client_transactions (client_id, amount, type, description, metadata)
    VALUES (p_client_id, -p_credit_used, 'lead_purchase', 'Lead purchase (' || p_purchase_type || ')', jsonb_build_object('lead_id', p_lead_id, 'purchase_type', p_purchase_type));
  END IF;

  -- 4. Record the purchase
  INSERT INTO public.lead_purchases (lead_id, client_id, purchase_type, price_paid)
  VALUES (p_lead_id, p_client_id, p_purchase_type, p_price_paid);

  -- 5. Update the lead state
  IF p_purchase_type = 'exclusive' THEN
    UPDATE public.leads
    SET 
      is_exclusive_sold = true,
      purchase_count = purchase_count + 1,
      status = 'sold',
      client_id = p_client_id -- legacy fallback
    WHERE id = p_lead_id;
  ELSE
    -- Share purchase
    UPDATE public.leads
    SET 
      purchase_count = purchase_count + 1,
      status = CASE WHEN purchase_count + 1 >= max_shares THEN 'sold' ELSE status END
    WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Migrate existing lead purchases to transactions (only those paid with price > 0, assuming credits were used if price_paid is 0 in some cases, but lead_purchases stores price_paid)
-- Actually, lead_purchases.price_paid is the cash paid. If they used credits, it's not clearly separated in lead_purchases.
-- But the user wants to see "spend". I'll sum lead_purchases and topups separately.
