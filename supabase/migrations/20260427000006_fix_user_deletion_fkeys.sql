-- Fix foreign key constraint on discount_codes to allow user deletion
ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS discount_codes_created_by_fkey;

ALTER TABLE public.discount_codes
ADD CONSTRAINT discount_codes_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Also fix other assignment fields just in case they block deletion
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_assigned_to_fkey;

ALTER TABLE public.clients
ADD CONSTRAINT clients_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES auth.users(id)
ON DELETE SET NULL;

ALTER TABLE public.leads
DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey;

ALTER TABLE public.leads
ADD CONSTRAINT leads_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES public.users(id)
ON DELETE SET NULL;

ALTER TABLE public.contractors
DROP CONSTRAINT IF EXISTS contractors_assigned_to_fkey;

ALTER TABLE public.contractors
ADD CONSTRAINT contractors_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES public.users(id)
ON DELETE SET NULL;
