CREATE OR REPLACE FUNCTION extend_lead_pack_reservation(p_membership_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.lead_pack_memberships
    SET reserved_until = timezone('utc'::text, now()) + interval '30 minutes'
    WHERE id = p_membership_id
      AND status = 'calling';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the initial reservation to 30 minutes just in case
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