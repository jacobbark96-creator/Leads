-- 1. Modify complete_lead_in_pack to conditionally assign leads
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
BEGIN
    UPDATE public.lead_pack_memberships
    SET 
        status = 'called',
        disposition = p_disposition,
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
            status = p_disposition,
            assigned_to = v_rep_id
        WHERE id = v_lead_id;
    ELSE
        -- For others (Voicemail, No Answer, DNC, Skipped)
        -- We update the status, but do NOT assign it
        UPDATE public.leads
        SET status = p_disposition
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


-- 2. Create the regenerate_pack RPC
CREATE OR REPLACE FUNCTION regenerate_pack(p_pack_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Extract assigned leads (e.g. Call Back) out of the pack into "My Leads"
    --    so they aren't called by other users.
    UPDATE public.leads
    SET is_in_pack = false
    WHERE id IN (
        SELECT m.lead_id FROM public.lead_pack_memberships m
        JOIN public.leads l ON l.id = m.lead_id
        WHERE m.lead_pack_id = p_pack_id
          AND m.status = 'called'
          AND m.disposition NOT IN ('DNC', 'Qualified')
          AND l.assigned_to IS NOT NULL
    );

    DELETE FROM public.lead_pack_memberships
    WHERE lead_pack_id = p_pack_id
      AND status = 'called'
      AND disposition NOT IN ('DNC', 'Qualified')
      AND lead_id IN (SELECT id FROM public.leads WHERE assigned_to IS NOT NULL);

    -- 2. Reset the remaining unassigned leads (Voicemail, No Answer, Skipped)
    --    back to 'uncalled' inside the pack so anyone can call them again.
    UPDATE public.lead_pack_memberships
    SET 
        status = 'uncalled',
        disposition = NULL,
        assigned_rep_id = NULL,
        reserved_until = NULL
    WHERE lead_pack_id = p_pack_id
      AND status = 'called'
      AND disposition NOT IN ('DNC', 'Qualified');

    -- 3. Recalculate pack stats
    UPDATE public.lead_packs
    SET 
        total_leads = (SELECT count(*) FROM public.lead_pack_memberships WHERE lead_pack_id = p_pack_id),
        leads_called = (SELECT count(*) FROM public.lead_pack_memberships WHERE lead_pack_id = p_pack_id AND status = 'called')
    WHERE id = p_pack_id;
    
    UPDATE public.lead_packs
    SET leads_remaining = GREATEST(0, total_leads - leads_called)
    WHERE id = p_pack_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
