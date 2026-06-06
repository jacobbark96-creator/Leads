-- Retroactively set is_in_pack to true for any lead that is assigned to a user 
-- but currently marked as not in a pack. This ensures they show up in the 
-- "My Leads" counter on the Unqualified Leads page instead of being stuck in the Archive.

UPDATE public.leads
SET is_in_pack = true
WHERE assigned_to IS NOT NULL 
  AND is_in_pack = false
  AND status != 'qualified';