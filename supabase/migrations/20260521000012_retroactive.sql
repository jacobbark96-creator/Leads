-- Retroactively fix assignments in the leads table based on the new logic

-- 1. Unassign leads that are in packs and were called with Voicemail/No Answer/Skipped
UPDATE public.leads l
SET assigned_to = NULL
FROM public.lead_pack_memberships m
WHERE m.lead_id = l.id
  AND m.status = 'called'
  AND m.disposition NOT IN ('Call Back', 'Qualified');

-- 2. Assign leads that are in packs and were called with Call Back or Qualified
UPDATE public.leads l
SET 
    assigned_to = m.assigned_rep_id,
    status = m.disposition
FROM public.lead_pack_memberships m
WHERE m.lead_id = l.id
  AND m.status = 'called'
  AND m.disposition IN ('Call Back', 'Qualified')
  AND m.assigned_rep_id IS NOT NULL;
