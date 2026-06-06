ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS other_contacts TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS other_contact_numbers TEXT;

ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS other_contacts TEXT;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS other_contact_numbers TEXT;
