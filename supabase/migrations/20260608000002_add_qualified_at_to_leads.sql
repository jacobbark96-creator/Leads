-- Add qualified_at column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;

-- Try to populate qualified_at from activities table for existing leads
UPDATE leads l
SET qualified_at = a.created_at
FROM (
  SELECT lead_id, MIN(created_at) as created_at
  FROM activities
  WHERE activity_type = 'qualified'
  GROUP BY lead_id
) a
WHERE l.id = a.lead_id AND l.qualified_at IS NULL;

-- Fallback for leads that are already in a qualified status but don't have an activity record
UPDATE leads
SET qualified_at = created_at
WHERE status IN ('qualified', 'sold', 'marketplace', 'awaiting_sales') AND qualified_at IS NULL;

-- Create function to automatically set qualified_at when status changes
CREATE OR REPLACE FUNCTION set_qualified_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changes to a qualified status and qualified_at is not already set
  IF (NEW.status IN ('qualified', 'sold', 'marketplace', 'awaiting_sales') AND 
      (OLD.status IS NULL OR OLD.status NOT IN ('qualified', 'sold', 'marketplace', 'awaiting_sales'))) THEN
    IF NEW.qualified_at IS NULL THEN
      NEW.qualified_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_set_qualified_at ON leads;
CREATE TRIGGER trg_set_qualified_at
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_qualified_at();
