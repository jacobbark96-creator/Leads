-- Function to log lead activities
CREATE OR REPLACE FUNCTION log_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for Qualification
  IF NEW.status = 'sat' AND (TG_OP = 'INSERT' OR OLD.status != 'sat') THEN
    INSERT INTO activities (lead_id, user_id, activity_type, description)
    VALUES (
      NEW.id, 
      NEW.assigned_to, 
      'qualified', 
      COALESCE(NEW.company, NEW.name) || ' - Qualified'
    );
  END IF;

  -- Check for Marketed
  IF NEW.is_marketed = true AND (TG_OP = 'INSERT' OR OLD.is_marketed = false) THEN
    INSERT INTO activities (lead_id, user_id, activity_type, description)
    VALUES (
      NEW.id, 
      NEW.assigned_to, 
      'marketed', 
      COALESCE(NEW.company, NEW.name) || ' - Marketed'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for leads
DROP TRIGGER IF EXISTS lead_activity_trigger ON leads;
CREATE TRIGGER lead_activity_trigger
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_activity();

-- Function to log lead purchases
CREATE OR REPLACE FUNCTION log_purchase_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_name TEXT;
  v_client_name TEXT;
BEGIN
  -- Get Lead Name
  SELECT COALESCE(company, name) INTO v_lead_name FROM leads WHERE id = NEW.lead_id;
  
  -- Get Client Name
  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;

  INSERT INTO activities (lead_id, user_id, activity_type, description)
  VALUES (
    NEW.lead_id, 
    NULL, 
    'sold', 
    v_lead_name || ' - Sold - ' || COALESCE(v_client_name, 'Unknown Buyer')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for lead_purchases
DROP TRIGGER IF EXISTS purchase_activity_trigger ON lead_purchases;
CREATE TRIGGER purchase_activity_trigger
  AFTER INSERT ON lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION log_purchase_activity();