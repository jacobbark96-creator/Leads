-- Function to recalculate invoice totals
CREATE OR REPLACE FUNCTION public.recalculate_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  -- Determine which invoice ID needs recalculating
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- If an invoice ID is present, recalculate its total
  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET total_amount = (
      SELECT COALESCE(SUM(price_paid), 0)
      FROM public.lead_purchases
      WHERE invoice_id = v_invoice_id
    )
    WHERE id = v_invoice_id;
  END IF;

  -- If it's an UPDATE and the invoice_id changed, recalculate the old one too
  IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id AND OLD.invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET total_amount = (
      SELECT COALESCE(SUM(price_paid), 0)
      FROM public.lead_purchases
      WHERE invoice_id = OLD.invoice_id
    )
    WHERE id = OLD.invoice_id;
  END IF;

  RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_recalculate_invoice_total ON public.lead_purchases;

-- Create the trigger
CREATE TRIGGER trigger_recalculate_invoice_total
AFTER INSERT OR UPDATE OR DELETE ON public.lead_purchases
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_invoice_total();

-- Backfill script to fix any currently out-of-sync invoices
UPDATE public.invoices i
SET total_amount = (
  SELECT COALESCE(SUM(price_paid), 0)
  FROM public.lead_purchases lp
  WHERE lp.invoice_id = i.id
);