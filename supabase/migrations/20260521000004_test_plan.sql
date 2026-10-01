-- We can create a function to return the EXPLAIN output
CREATE OR REPLACE FUNCTION explain_count()
RETURNS TABLE(plan text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY EXPLAIN ANALYZE SELECT count(id) FROM leads WHERE status = 'fresh' AND is_in_pack = false;
END;
$$;
