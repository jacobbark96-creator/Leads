-- Retroactively fix purchase_date for sold leads
UPDATE public.leads l
SET purchase_date = (
    SELECT MIN(purchased_at)
    FROM public.lead_purchases lp
    WHERE lp.lead_id = l.id
)
WHERE l.status = 'sold' AND l.purchase_date IS NULL;
