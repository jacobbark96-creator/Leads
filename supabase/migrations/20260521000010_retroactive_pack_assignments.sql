-- Retroactively assign leads in packs to the reps who called them
UPDATE public.leads l
SET 
    assigned_to = m.assigned_rep_id,
    status = m.disposition
FROM public.lead_pack_memberships m
WHERE m.lead_id = l.id
  AND m.status = 'called'
  AND m.assigned_rep_id IS NOT NULL;
