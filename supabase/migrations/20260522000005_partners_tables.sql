CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url TEXT,
    link TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.partner_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;

-- Policies for partners
CREATE POLICY "Anyone can read active partners" ON public.partners
    FOR SELECT USING (active = true OR public.get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage partners" ON public.partners
    FOR ALL USING (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- Policies for partner clicks
CREATE POLICY "Admins can read partner clicks" ON public.partner_clicks
    FOR SELECT USING (public.get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Anyone can insert partner clicks" ON public.partner_clicks
    FOR INSERT WITH CHECK (true);

-- RPC to track clicks
CREATE OR REPLACE FUNCTION track_partner_click(p_partner_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.partner_clicks (partner_id, user_id)
    VALUES (p_partner_id, p_user_id);
    
    UPDATE public.partners
    SET clicks = clicks + 1
    WHERE id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
