-- RPC to efficiently mass-delete junk leads without timing out
CREATE OR REPLACE FUNCTION delete_junk_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    WITH deleted AS (
        DELETE FROM leads
        WHERE status != 'qualified'
        AND (company IS NULL OR company = '' OR company ILIKE '%Unknown Company%')
        AND (phone IS NULL OR phone = '' OR phone = 'No Phone')
        AND (secondary_phone IS NULL OR secondary_phone = '' OR secondary_phone = 'No Phone')
        RETURNING id
    )
    SELECT count(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$;

-- RPC to delete a lead pack AND all leads that are currently inside it
CREATE OR REPLACE FUNCTION delete_pack_and_its_leads(p_pack_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_leads_count integer;
BEGIN
    -- Delete all leads that have a membership in this pack
    WITH deleted AS (
        DELETE FROM leads
        WHERE id IN (
            SELECT lead_id 
            FROM lead_pack_memberships 
            WHERE lead_pack_id = p_pack_id
        )
        RETURNING id
    )
    SELECT count(*) INTO deleted_leads_count FROM deleted;

    -- The pack memberships will cascade delete, but we also need to delete the pack itself
    DELETE FROM lead_packs WHERE id = p_pack_id;
    
    RETURN deleted_leads_count;
END;
$$;
