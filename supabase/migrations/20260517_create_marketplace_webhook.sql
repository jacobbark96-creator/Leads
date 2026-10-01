-- In Supabase, HTTP requests from triggers require the pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to trigger our Next.js API broadcast route
CREATE OR REPLACE FUNCTION trigger_marketplace_broadcast()
RETURNS TRIGGER AS $$
DECLARE
  app_url TEXT;
  auth_secret TEXT;
  payload JSONB;
BEGIN
  -- Only fire if the lead is newly marketed
  IF NEW.is_marketed = true AND (TG_OP = 'INSERT' OR OLD.is_marketed = false) THEN
    
    -- In production, these should be stored in Vault or a secure settings table
    -- For now we define the structure of the request
    app_url := current_setting('app.settings.base_url', true);
    IF app_url IS NULL THEN
      -- Fallback for local development if not set in DB
      app_url := 'http://host.docker.internal:3000';
    END IF;

    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)
    );

    -- Perform the async HTTP POST request using pg_net
    -- We fire and forget. The Next.js API handles the matching and Twilio logic.
    PERFORM net.http_post(
      url := app_url || '/api/marketplace/broadcast',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.internal_api_secret', true)
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the leads table
DROP TRIGGER IF EXISTS marketplace_broadcast_trigger ON leads;
CREATE TRIGGER marketplace_broadcast_trigger
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_marketplace_broadcast();