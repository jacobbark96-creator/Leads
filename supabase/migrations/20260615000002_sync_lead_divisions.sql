-- Sync division_id from lead_packs to leads via memberships
-- This ensures that reps assigned to a pack can actually see the leads in that pack due to RLS
UPDATE public.leads l
SET division_id = lp.division_id
FROM public.lead_pack_memberships lpm
JOIN public.lead_packs lp ON lpm.lead_pack_id = lp.id
WHERE l.id = lpm.lead_id
AND (l.division_id IS NULL OR l.division_id != lp.division_id)
AND lp.division_id IS NOT NULL;
