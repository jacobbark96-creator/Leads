-- Update function to log lead purchases and requests separately
CREATE OR REPLACE FUNCTION log_purchase_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_name TEXT;
  v_client_name TEXT;
  v_activity_type TEXT;
  v_description TEXT;
BEGIN
  -- Determine activity type based on status
  -- 'permission_pending' is a request from a child account
  -- 'new' is a confirmed purchase (either direct or approved)
  IF NEW.status = 'permission_pending' THEN
    v_activity_type := 'requested';
  ELSIF NEW.status = 'new' THEN
    v_activity_type := 'sold';
  ELSE
    -- We don't log 'rejected' or other statuses in the live feed for now
    RETURN NEW;
  END IF;

  -- Only log if it's a new record or if the status changed to something we care about
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get Lead Name
  SELECT COALESCE(company, name) INTO v_lead_name FROM leads WHERE id = NEW.lead_id;
  
  -- Get Client Name
  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;

  IF v_activity_type = 'requested' THEN
    v_description := v_lead_name || ' - Requested - ' || COALESCE(v_client_name, 'Unknown Buyer');
  ELSE
    v_description := v_lead_name || ' - Sold - ' || COALESCE(v_client_name, 'Unknown Buyer');
  END IF;

  INSERT INTO activities (lead_id, user_id, activity_type, description)
  VALUES (
    NEW.lead_id, 
    NULL, 
    v_activity_type, 
    v_description
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to handle updates as well (needed to log 'sold' when a request is approved)
DROP TRIGGER IF EXISTS purchase_activity_trigger ON lead_purchases;
CREATE TRIGGER purchase_activity_trigger
  AFTER INSERT OR UPDATE ON lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION log_purchase_activity();
