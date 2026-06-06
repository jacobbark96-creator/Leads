-- Add slug and action_link to magic_checkout_links
ALTER TABLE public.magic_checkout_links
ADD COLUMN slug VARCHAR(50) UNIQUE,
ADD COLUMN action_link TEXT;

-- Create an index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_magic_checkout_links_slug ON public.magic_checkout_links(slug);
