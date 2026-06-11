-- Update the check constraint on the users table to include 'growth_manager'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role::text = ANY (ARRAY['client'::text, 'sales'::text, 'admin'::text, 'super_admin'::text, 'rep'::text, 'growth_manager'::text]));
