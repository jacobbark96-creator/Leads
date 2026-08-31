-- Update function to log lead purchases and requests separately with all statuses
CREATE OR REPLACE FUNCTION log_purchase_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_name TEXT;
  v_client_name TEXT;
  v_activity_type TEXT;
  v_description TEXT;
BEGIN
  -- Determine activity type based on status
  IF NEW.status = 'permission_pending' THEN
    v_activity_type := 'requested';
  ELSIF NEW.status = 'new' THEN
    v_activity_type := 'sold';
  ELSIF NEW.status = 'contacted' THEN
    v_activity_type := 'contacted';
  ELSIF NEW.status = 'sat' THEN
    v_activity_type := 'surveyed';
  ELSIF NEW.status = 'proposal' THEN
    v_activity_type := 'proposal';
  ELSIF NEW.status = 'won' THEN
    v_activity_type := 'won';
  ELSIF NEW.status = 'archive' THEN
    v_activity_type := 'archived';
  ELSE
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
  ELSIF v_activity_type = 'sold' THEN
    v_description := v_lead_name || ' - Sold - ' || COALESCE(v_client_name, 'Unknown Buyer');
  ELSE
    v_description := v_lead_name || ' - ' || initcap(v_activity_type) || ' - ' || COALESCE(v_client_name, 'Unknown Buyer');
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
