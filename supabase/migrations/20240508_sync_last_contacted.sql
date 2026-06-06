-- Create a function to update the last_dialed_at column in the leads table
CREATE OR REPLACE FUNCTION update_lead_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads
    SET last_dialed_at = NEW.created_at
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that calls the function after a new note is inserted
DROP TRIGGER IF EXISTS trigger_update_lead_last_contacted ON lead_notes;
CREATE TRIGGER trigger_update_lead_last_contacted
AFTER INSERT ON lead_notes
FOR EACH ROW
EXECUTE FUNCTION update_lead_last_contacted();

-- Sync existing last_dialed_at with the most recent note for all leads
UPDATE leads l
SET last_dialed_at = (
    SELECT MAX(created_at)
    FROM lead_notes n
    WHERE n.lead_id = l.id
)
WHERE EXISTS (
    SELECT 1 FROM lead_notes n WHERE n.lead_id = l.id
);
