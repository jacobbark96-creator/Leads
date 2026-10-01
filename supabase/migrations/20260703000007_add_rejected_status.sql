-- Update lead_purchases status constraint to include rejected
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_purchases_status_check') THEN
        ALTER TABLE public.lead_purchases DROP CONSTRAINT lead_purchases_status_check;
    END IF;
END $$;

ALTER TABLE public.lead_purchases 
ADD CONSTRAINT lead_purchases_status_check 
CHECK (status::text = ANY (ARRAY['new'::text, 'sat'::text, 'won'::text, 'permission_pending'::text, 'rejected'::text]));
