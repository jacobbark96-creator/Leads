-- Force vacuum and analyze to update statistics after massive UPDATE
-- Note: VACUUM cannot be run inside a transaction block in migrations usually, 
-- but ANALYZE can.
ANALYZE public.leads;
