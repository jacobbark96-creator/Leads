CREATE OR REPLACE FUNCTION explain_count_contractors()
RETURNS TABLE(plan text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY EXPLAIN ANALYZE 
    SELECT count(id) FROM contractors;
END;
$$;
