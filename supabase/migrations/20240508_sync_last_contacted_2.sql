-- Ensure the function exists
CREATE OR REPLACE FUNCTION update_lead_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads
    SET last_dialed_at = NEW.created_at
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger
DROP TRIGGER IF EXISTS trigger_update_lead_last_contacted ON lead_notes;
CREATE TRIGGER trigger_update_lead_last_contacted
AFTER INSERT ON lead_notes
FOR EACH ROW
EXECUTE FUNCTION update_lead_last_contacted();

-- Force update all leads that have notes
UPDATE leads l
SET last_dialed_at = (
    SELECT MAX(created_at)
    FROM lead_notes n
    WHERE n.lead_id = l.id
)
WHERE EXISTS (
    SELECT 1 FROM lead_notes n WHERE n.lead_id = l.id
);
