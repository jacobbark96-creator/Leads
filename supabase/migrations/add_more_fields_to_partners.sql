ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS additional_photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;
