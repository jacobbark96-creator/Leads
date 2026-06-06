CREATE OR REPLACE FUNCTION log_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for Qualification
  IF NEW.status ILIKE 'qualified' AND (TG_OP = 'INSERT' OR OLD.status NOT ILIKE 'qualified') THEN
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

-- Retroactively insert 'qualified' activity for existing qualified leads that don't have it
INSERT INTO activities (lead_id, user_id, activity_type, description, created_at)
SELECT id, assigned_to, 'qualified', COALESCE(company, name) || ' - Qualified', COALESCE(first_contacted_at, created_at)
FROM leads
WHERE status ILIKE 'qualified'
AND id NOT IN (
    SELECT lead_id FROM activities WHERE activity_type = 'qualified'
);
