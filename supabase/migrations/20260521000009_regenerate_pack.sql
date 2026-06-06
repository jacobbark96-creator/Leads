-- 1. Modify complete_lead_in_pack to ALSO update the leads table with the rep and disposition
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

    -- Update the main lead record so it belongs to the rep who dispositioned it
    UPDATE public.leads
    SET 
        status = p_disposition,
        assigned_to = v_rep_id
    WHERE id = v_lead_id;

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
    -- Extract leads that were called and NOT DNC/Qualified
    -- Push them to the reps' "My Leads" by setting is_in_pack = false
    
    UPDATE public.leads
    SET is_in_pack = false
    WHERE id IN (
        SELECT lead_id FROM public.lead_pack_memberships
        WHERE lead_pack_id = p_pack_id
          AND status = 'called'
          AND disposition NOT IN ('DNC', 'Qualified', 'sold', 'marketplace')
    );

    -- Remove them from the pack memberships so they aren't double-counted in the pack
    DELETE FROM public.lead_pack_memberships
    WHERE lead_pack_id = p_pack_id
      AND status = 'called'
      AND disposition NOT IN ('DNC', 'Qualified', 'sold', 'marketplace');

    -- Recalculate pack stats
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
