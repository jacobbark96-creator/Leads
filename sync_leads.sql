UPDATE leads l
SET status = CASE WHEN lp.status = 'new' THEN 'sold' ELSE lp.status END
FROM lead_purchases lp
WHERE l.id = lp.lead_id
  AND lp.status IN ('sat', 'proposal', 'won', 'refunded', 'contacted', 'archive')
  AND l.status != lp.status;
