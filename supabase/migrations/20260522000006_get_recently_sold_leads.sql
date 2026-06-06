CREATE OR REPLACE FUNCTION public.get_recently_sold_leads()
RETURNS SETOF public.leads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.leads
    WHERE client_id IS NOT NULL
    ORDER BY purchase_date DESC NULLS LAST, created_at DESC
    LIMIT 5;
$$;
