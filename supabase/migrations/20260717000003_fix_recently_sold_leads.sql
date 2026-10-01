-- Update get_recently_sold_leads to correctly include fully shared leads and sold leads
CREATE OR REPLACE FUNCTION public.get_recently_sold_leads()
RETURNS SETOF public.leads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.leads
    WHERE client_id IS NOT NULL 
       OR marked_as_sold = true 
       OR status = 'sold'
       OR purchase_count >= max_shares
    ORDER BY COALESCE(purchase_date, created_at) DESC
    LIMIT 20;
$$;

-- Fix any existing bad data: if a lead is sold, it shouldn't be marketed
UPDATE public.leads
SET is_marketed = false
WHERE (status = 'sold' OR marked_as_sold = true OR purchase_count >= max_shares)
  AND is_marketed = true;