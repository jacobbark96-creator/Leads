-- RPC for fetching and reserving the next lead in a lead pack
CREATE OR REPLACE FUNCTION reserve_next_lead_in_pack(p_lead_pack_id UUID, p_rep_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_membership RECORD;
    v_lead RECORD;
    v_result JSONB;
BEGIN
    -- Find the next available lead
    -- It should be either 'uncalled' or ('calling' but reservation has expired)
    -- We use FOR UPDATE SKIP LOCKED to prevent concurrent access issues
    SELECT * INTO v_membership
    FROM public.lead_pack_memberships
    WHERE lead_pack_id = p_lead_pack_id
      AND (
          status = 'uncalled' 
          OR (status = 'calling' AND reserved_until < timezone('utc'::text, now()))
      )
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_membership IS NULL THEN
        RETURN NULL;
    END IF;

    -- Reserve the lead
    UPDATE public.lead_pack_memberships
    SET 
        status = 'calling',
        assigned_rep_id = p_rep_id,
        reserved_until = timezone('utc'::text, now()) + interval '10 minutes'
    WHERE id = v_membership.id;

    -- Update pack stats (if it was uncalled before)
    IF v_membership.status = 'uncalled' THEN
        UPDATE public.lead_packs
        SET leads_remaining = GREATEST(0, leads_remaining - 1)
        WHERE id = p_lead_pack_id;
    END IF;

    -- Fetch the lead details
    SELECT * INTO v_lead
    FROM public.leads
    WHERE id = v_membership.lead_id;

    -- Construct the result
    v_result := jsonb_build_object(
        'membership_id', v_membership.id,
        'lead_id', v_lead.id,
        'lead', row_to_json(v_lead)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for releasing a lead back to the queue (if skipped/cancelled)
CREATE OR REPLACE FUNCTION release_lead_in_pack(p_membership_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.lead_pack_memberships
    SET 
        status = 'uncalled',
        assigned_rep_id = NULL,
        reserved_until = NULL
    WHERE id = p_membership_id;

    -- Increment leads_remaining since it was un-called
    UPDATE public.lead_packs
    SET leads_remaining = total_leads - leads_called
    WHERE id = (SELECT lead_pack_id FROM public.lead_pack_memberships WHERE id = p_membership_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for completing a lead call in a pack
CREATE OR REPLACE FUNCTION complete_lead_in_pack(
    p_membership_id UUID, 
    p_disposition TEXT,
    p_notes TEXT
)
RETURNS VOID AS $$
DECLARE
    v_pack_id UUID;
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
    RETURNING lead_pack_id INTO v_pack_id;

    -- Update pack stats
    UPDATE public.lead_packs
    SET 
        leads_called = leads_called + 1,
        leads_remaining = GREATEST(0, total_leads - (leads_called + 1))
    WHERE id = v_pack_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
