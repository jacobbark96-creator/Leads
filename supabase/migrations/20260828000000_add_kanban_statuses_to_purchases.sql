-- Fix lead_purchases status constraint to allow new Kanban stages (contacted, proposal, archive)

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop any check constraints on the status column of lead_purchases
    FOR r IN (
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.lead_purchases'::regclass
        AND a.attname = 'status'
        AND c.contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE public.lead_purchases DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Add the comprehensive check constraint with new Kanban statuses
ALTER TABLE public.lead_purchases 
ADD CONSTRAINT lead_purchases_status_check 
CHECK (status::text = ANY (ARRAY[
    'new'::text, 
    'contacted'::text,
    'sat'::text, 
    'proposal'::text,
    'won'::text, 
    'archive'::text,
    'permission_pending'::text, 
    'rejected'::text
]));
