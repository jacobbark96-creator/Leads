-- Update lead_events table check constraint to allow 'purchase_complete'
ALTER TABLE public.lead_events DROP CONSTRAINT IF EXISTS lead_events_event_type_check;
ALTER TABLE public.lead_events ADD CONSTRAINT lead_events_event_type_check 
CHECK (event_type IN ('view', 'order_summary', 'checkout', 'purchase_complete'));
