-- Modify complete_lead_in_pack to save status in lowercase
CREATE OR REPLACE FUNCTION complete_lead_in_pack(
    p_membership_id UUID, 
    p_disposition TEXT,
    p_notes TEXT
)
RETURNS VOID AS $$
DECLARE
    v_pack_id UUID;
    v_lead_id UUID;
    v_rep_id UUID;
    v_normalized_disp TEXT;
BEGIN
    v_normalized_disp := LOWER(p_disposition);

    UPDATE public.lead_pack_memberships
    SET 
        status = 'called',
        disposition = p_disposition, -- keep original here for UI if needed
        notes = p_notes,
        last_called_at = timezone('utc'::text, now()),
        call_attempts = call_attempts + 1,
        reserved_until = NULL
    WHERE id = p_membership_id
    RETURNING lead_pack_id, lead_id, assigned_rep_id INTO v_pack_id, v_lead_id, v_rep_id;

    -- Update the main lead record
    -- ONLY assign to the rep if it's 'Call Back' or 'Qualified'
    IF p_disposition IN ('Call Back', 'Qualified') THEN
        UPDATE public.leads
        SET 
            status = v_normalized_disp,
            assigned_to = v_rep_id
        WHERE id = v_lead_id;
    ELSE
        -- For others (Voicemail, No Answer, DNC, Skipped)
        -- We update the status, but do NOT assign it
        UPDATE public.leads
        SET status = v_normalized_disp
        WHERE id = v_lead_id;
    END IF;

    -- Update pack stats
    UPDATE public.lead_packs
    SET 
        leads_called = leads_called + 1,
        leads_remaining = GREATEST(0, total_leads - (leads_called + 1))
    WHERE id = v_pack_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix existing leads that have uppercase statuses
UPDATE public.leads
SET status = LOWER(status)
WHERE status IN ('Qualified', 'Call Back', 'DNC', 'Voicemail', 'No Answer', 'Skipped');
