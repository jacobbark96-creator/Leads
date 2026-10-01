CREATE OR REPLACE FUNCTION explain_count_qualified()
RETURNS TABLE(plan text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY EXPLAIN ANALYZE 
    SELECT count(id) FROM leads 
    WHERE status IN ('qualified', 'sold', 'marketplace');
END;
$$;
