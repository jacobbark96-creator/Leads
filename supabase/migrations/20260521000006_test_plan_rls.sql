CREATE OR REPLACE FUNCTION explain_count_rls(p_uid UUID)
RETURNS TABLE(plan text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- We can't easily simulate RLS in EXPLAIN without setting the local auth.uid, 
    -- but we can just add the typical RLS condition manually.
    RETURN QUERY EXPLAIN ANALYZE 
    SELECT count(id) FROM leads 
    WHERE status = 'fresh' AND is_in_pack = false
    AND (
        -- Typical RLS policy for a rep
        assigned_to = p_uid
    );
END;
$$;
