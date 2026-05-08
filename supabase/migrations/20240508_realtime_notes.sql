DO $$
BEGIN
  -- Check if the publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Check if the table is already in the publication
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'lead_notes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE lead_notes;
    END IF;
  END IF;
END
$$;
