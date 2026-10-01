-- 1. Update complete_lead_in_pack to handle DNC and assigned leads better
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
    v_rep_name TEXT;
BEGIN
    v_normalized_disp := LOWER(p_disposition);

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

    -- Fetch the rep's name for the note author
    SELECT name INTO v_rep_name FROM public.users WHERE id = v_rep_id;

    -- Update the main lead record
    IF v_normalized_disp IN ('call back', 'qualified') THEN
        UPDATE public.leads
        SET 
            status = v_normalized_disp,
            assigned_to = v_rep_id,
            is_in_pack = false -- Remove from pack to move to "My Leads"
        WHERE id = v_lead_id;
    ELSIF v_normalized_disp = 'dnc' THEN
        UPDATE public.leads
        SET 
            status = 'dnc',
            is_in_pack = false -- Remove from pack completely
        WHERE id = v_lead_id;
    ELSE
        -- For others (Voicemail, No Answer, Skipped)
        UPDATE public.leads
        SET status = v_normalized_disp
        WHERE id = v_lead_id;
    END IF;

    -- Also insert a note into lead_notes if provided
    IF p_notes IS NOT NULL AND p_notes != '' THEN
        INSERT INTO public.lead_notes (lead_id, user_id, author_name, content)
        VALUES (v_lead_id, v_rep_id, COALESCE(v_rep_name, 'System'), 'Pack Calling Disposition: ' || p_notes);
    END IF;

    -- Update pack stats
    UPDATE public.lead_packs
    SET 
        leads_called = leads_called + 1,
        leads_remaining = GREATEST(0, total_leads - (leads_called + 1))
    WHERE id = v_pack_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update regenerate_pack to only reset Voicemail leads
CREATE OR REPLACE FUNCTION regenerate_pack(p_pack_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Remove leads that were assigned or marked DNC/Qualified from the pack
    --    They should have is_in_pack = false and be gone from memberships
    UPDATE public.leads
    SET is_in_pack = false
    WHERE id IN (
        SELECT m.lead_id FROM public.lead_pack_memberships m
        JOIN public.leads l ON l.id = m.lead_id
        WHERE m.lead_pack_id = p_pack_id
          AND m.status = 'called'
          AND (
              l.assigned_to IS NOT NULL 
              OR LOWER(m.disposition) IN ('dnc', 'qualified')
          )
    );

    DELETE FROM public.lead_pack_memberships
    WHERE lead_pack_id = p_pack_id
      AND status = 'called'
      AND (
          lead_id IN (SELECT id FROM public.leads WHERE assigned_to IS NOT NULL)
          OR LOWER(disposition) IN ('dnc', 'qualified')
      );

    -- 2. Reset ONLY Voicemail leads back to 'uncalled'
    --    Everything else (No Answer, Skipped, Busy) stays as 'called'
    --    so they aren't added back to the dialer queue.
    UPDATE public.lead_pack_memberships
    SET 
        status = 'uncalled',
        disposition = NULL,
        assigned_rep_id = NULL,
        reserved_until = NULL
    WHERE lead_pack_id = p_pack_id
      AND status = 'called'
      AND LOWER(disposition) = 'voicemail';

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

-- 3. Update reserve_next_lead_in_pack to ensure assigned leads are skipped
CREATE OR REPLACE FUNCTION reserve_next_lead_in_pack(p_lead_pack_id UUID, p_rep_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_membership RECORD;
    v_lead RECORD;
    v_result JSONB;
BEGIN
    LOOP
        SELECT m.* INTO v_membership
        FROM public.lead_pack_memberships m
        WHERE m.lead_pack_id = p_lead_pack_id
          AND (
              m.status = 'uncalled' 
              OR (m.status = 'calling' AND m.reserved_until < timezone('utc'::text, now()))
          )
        ORDER BY m.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF v_membership IS NULL THEN
            RETURN NULL;
        END IF;

        -- Fetch the underlying lead
        SELECT * INTO v_lead FROM public.leads WHERE id = v_membership.lead_id;

        -- If the lead was already qualified, DNC, or assigned to someone, we shouldn't dial it
        IF v_lead.status IN ('qualified', 'dnc') OR v_lead.assigned_to IS NOT NULL THEN
            -- Mark as externally handled
            UPDATE public.lead_pack_memberships
            SET 
                status = 'called',
                disposition = 'Externally Handled',
                last_called_at = timezone('utc'::text, now())
            WHERE id = v_membership.id;

            -- Update pack stats (if it was uncalled before)
            IF v_membership.status = 'uncalled' THEN
                UPDATE public.lead_packs
                SET 
                    leads_called = leads_called + 1,
                    leads_remaining = GREATEST(0, leads_remaining - 1)
                WHERE id = p_lead_pack_id;
            END IF;

            -- Continue the loop to find the next valid lead
            CONTINUE;
        END IF;

        -- Reserve the lead
        UPDATE public.lead_pack_memberships
        SET 
            status = 'calling',
            assigned_rep_id = p_rep_id,
            reserved_until = timezone('utc'::text, now()) + interval '30 minutes'
        WHERE id = v_membership.id;

        -- Update pack stats (if it was uncalled before)
        IF v_membership.status = 'uncalled' THEN
            UPDATE public.lead_packs
            SET leads_remaining = GREATEST(0, leads_remaining - 1)
            WHERE id = p_lead_pack_id;
        END IF;

        -- Construct the result
        v_result := jsonb_build_object(
            'membership_id', v_membership.id,
            'lead_id', v_lead.id,
            'lead', row_to_json(v_lead)
        );

        RETURN v_result;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
