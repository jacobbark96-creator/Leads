-- Retroactively fix assigned_to for leads based on qualified activity
UPDATE public.leads l
SET assigned_to = (
    SELECT user_id
    FROM public.activities a
    WHERE a.lead_id = l.id AND a.activity_type = 'qualified'
    LIMIT 1
)
WHERE l.assigned_to IS NULL;
