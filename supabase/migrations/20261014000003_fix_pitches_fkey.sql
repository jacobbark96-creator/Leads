-- Fix lead_pitches foreign key for contractor_id to reference public.users instead of auth.users
ALTER TABLE public.lead_pitches DROP CONSTRAINT IF EXISTS lead_pitches_contractor_id_fkey;

ALTER TABLE public.lead_pitches
    ADD CONSTRAINT lead_pitches_contractor_id_fkey
    FOREIGN KEY (contractor_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';