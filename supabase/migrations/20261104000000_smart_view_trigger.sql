-- Create a function to remove leads from smart views when their status changes
CREATE OR REPLACE FUNCTION remove_from_smartview_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- When a lead is marked as DNC, Not viable, Qualified, or any other terminating status
        IF LOWER(NEW.status) IN ('dnc', 'not viable', 'qualified', 'dead', 'sold', 'refunded', 'archive', 'archived') THEN
            DELETE FROM public.smart_view_items WHERE lead_id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call this function on lead updates
DROP TRIGGER IF EXISTS trg_remove_from_smartview_on_status_change ON public.leads;
CREATE TRIGGER trg_remove_from_smartview_on_status_change
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION remove_from_smartview_on_status_change();

-- Ensure an index exists on lead_id to prevent the DELETE statement from doing sequential scans
CREATE INDEX IF NOT EXISTS idx_smart_view_items_lead_id ON public.smart_view_items(lead_id);
