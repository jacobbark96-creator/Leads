CREATE OR REPLACE FUNCTION decrement_trade_usage(
  p_user_id UUID,
  p_amount NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users 
  SET current_trade_usage = GREATEST(0, COALESCE(current_trade_usage, 0) - p_amount)
  WHERE id = p_user_id;
END;
$$;
