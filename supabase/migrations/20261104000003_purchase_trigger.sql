-- We need to call the loyalty processor whenever a lead is sold to an installer
-- Since purchases might happen via `purchase_lead` RPC, we can embed it in a trigger on the `leads` table or `lead_purchases` table.
-- Let's add it to `purchase_lead` RPC itself, or trigger on `leads` table update to `sold`.

CREATE OR REPLACE FUNCTION trg_loyalty_on_lead_sold()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to sold and there is an installer_id attached (we need to know the installer)
    IF NEW.status = 'sold' AND OLD.status IS DISTINCT FROM 'sold' AND NEW.installer_id IS NOT NULL THEN
        -- Check if price is > 0 (to ignore claiming a free lead itself)
        IF COALESCE(NEW.price, 0) > 0 OR COALESCE(NEW.exclusive_price, 0) > 0 THEN
            PERFORM process_installer_loyalty(NEW.installer_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_loyalty_on_lead_sold ON public.leads;
CREATE TRIGGER trg_loyalty_on_lead_sold
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION trg_loyalty_on_lead_sold();
