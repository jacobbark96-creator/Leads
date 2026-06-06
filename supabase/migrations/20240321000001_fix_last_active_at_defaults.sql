-- Fix last_active_at default value and clear existing fake data
ALTER TABLE public.users ALTER COLUMN last_active_at DROP DEFAULT;
UPDATE public.users SET last_active_at = NULL;
