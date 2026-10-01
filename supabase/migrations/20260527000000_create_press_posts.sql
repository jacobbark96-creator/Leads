-- Create press_posts table
CREATE TABLE IF NOT EXISTS public.press_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    seo_title TEXT,
    seo_description TEXT,
    image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    author_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.press_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view published posts" ON public.press_posts
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage press posts" ON public.press_posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_press_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_press_posts_updated_at_trigger
    BEFORE UPDATE ON public.press_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_press_posts_updated_at();
