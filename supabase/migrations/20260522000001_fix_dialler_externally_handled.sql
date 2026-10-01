-- Fix reserve_next_lead_in_pack to ignore leads that were handled outside the pack dialler
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
            reserved_until = timezone('utc'::text, now()) + interval '10 minutes'
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

-- Make regenerate_pack completely case insensitive for dispositions
CREATE OR REPLACE FUNCTION regenerate_pack(p_pack_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Extract assigned leads (e.g. Call Back) out of the pack into "My Leads"
    UPDATE public.leads
    SET is_in_pack = false
    WHERE id IN (
        SELECT m.lead_id FROM public.lead_pack_memberships m
        JOIN public.leads l ON l.id = m.lead_id
        WHERE m.lead_pack_id = p_pack_id
          AND m.status = 'called'
          AND LOWER(m.disposition) NOT IN ('dnc', 'qualified')
          AND l.assigned_to IS NOT NULL
    );

    DELETE FROM public.lead_pack_memberships
    WHERE lead_pack_id = p_pack_id
      AND status = 'called'
      AND LOWER(disposition) NOT IN ('dnc', 'qualified')
      AND lead_id IN (SELECT id FROM public.leads WHERE assigned_to IS NOT NULL);

    -- 2. Reset the remaining unassigned leads
    UPDATE public.lead_pack_memberships
    SET 
        status = 'uncalled',
        disposition = NULL,
        assigned_rep_id = NULL,
        reserved_until = NULL
    WHERE lead_pack_id = p_pack_id
      AND status = 'called'
      AND LOWER(disposition) NOT IN ('dnc', 'qualified');

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

-- Cleanup existing out-of-sync memberships
UPDATE public.lead_pack_memberships m
SET 
    status = 'called',
    disposition = 'Externally Handled',
    last_called_at = timezone('utc'::text, now())
FROM public.leads l
WHERE m.lead_id = l.id
  AND m.status = 'uncalled'
  AND (l.status IN ('qualified', 'dnc') OR l.assigned_to IS NOT NULL);

-- Recalculate pack stats for all packs after cleanup
UPDATE public.lead_packs p
SET 
    leads_called = (SELECT count(*) FROM public.lead_pack_memberships WHERE lead_pack_id = p.id AND status = 'called'),
    leads_remaining = GREATEST(0, total_leads - (SELECT count(*) FROM public.lead_pack_memberships WHERE lead_pack_id = p.id AND status = 'called'));
