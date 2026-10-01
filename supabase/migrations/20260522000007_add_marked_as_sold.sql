ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS marked_as_sold BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_recently_sold_leads()
RETURNS SETOF public.leads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.leads
    WHERE client_id IS NOT NULL OR marked_as_sold = true
    ORDER BY COALESCE(purchase_date, created_at) DESC
    LIMIT 5;
$$;
