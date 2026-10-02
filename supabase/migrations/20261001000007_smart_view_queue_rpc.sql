CREATE OR REPLACE FUNCTION reserve_next_lead_from_smartview_queue(
    p_smart_view_id UUID,
    p_lead_ids UUID[],
    p_rep_id UUID,
    p_queue_time TIMESTAMPTZ
) RETURNS TABLE (
    lead_id UUID,
    membership_id UUID
) AS $$
DECLARE
    v_membership_id UUID;
    v_lead_id UUID;
    v_id UUID;
BEGIN
    FOREACH v_id IN ARRAY p_lead_ids LOOP
        SELECT svi.membership_id, svi.lead_id INTO v_membership_id, v_lead_id
        FROM public.smart_view_items svi
        JOIN public.lead_pack_memberships lpm ON lpm.id = svi.membership_id
        WHERE svi.smart_view_id = p_smart_view_id
          AND svi.lead_id = v_id
          AND (lpm.reserved_until IS NULL OR lpm.reserved_until < timezone('utc'::text, now()))
          AND (lpm.last_called_at IS NULL OR lpm.last_called_at <= p_queue_time)
        LIMIT 1
        FOR UPDATE OF lpm SKIP LOCKED;

        IF v_membership_id IS NOT NULL THEN
            UPDATE public.lead_pack_memberships
            SET 
                reserved_until = timezone('utc'::text, now()) + interval '10 minutes',
                assigned_rep_id = p_rep_id
            WHERE id = v_membership_id;

            RETURN QUERY SELECT v_lead_id, v_membership_id;
            RETURN;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;