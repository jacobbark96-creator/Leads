CREATE TABLE IF NOT EXISTS public.smart_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pack_id UUID REFERENCES public.lead_packs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.smart_view_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    smart_view_id UUID REFERENCES public.smart_views(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.lead_pack_memberships(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(smart_view_id, lead_id)
);

-- RLS
ALTER TABLE public.smart_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_view_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own smart views" ON public.smart_views FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin'));
CREATE POLICY "Users can create their own smart views" ON public.smart_views FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own smart views" ON public.smart_views FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own smart views" ON public.smart_views FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view their own smart view items" ON public.smart_view_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.smart_views WHERE smart_views.id = smart_view_id AND (smart_views.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin'))));
CREATE POLICY "Users can insert their own smart view items" ON public.smart_view_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.smart_views WHERE smart_views.id = smart_view_id AND smart_views.user_id = auth.uid()));
CREATE POLICY "Users can delete their own smart view items" ON public.smart_view_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.smart_views WHERE smart_views.id = smart_view_id AND smart_views.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION reserve_next_lead_in_smartview(
    p_smart_view_id UUID,
    p_rep_id UUID
) RETURNS TABLE (
    lead_id UUID,
    membership_id UUID
) AS $$
DECLARE
    v_membership_id UUID;
    v_lead_id UUID;
BEGIN
    SELECT svi.membership_id, svi.lead_id INTO v_membership_id, v_lead_id
    FROM public.smart_view_items svi
    JOIN public.lead_pack_memberships lpm ON lpm.id = svi.membership_id
    WHERE svi.smart_view_id = p_smart_view_id
      AND lpm.status = 'uncalled'
      AND (lpm.reserved_until IS NULL OR lpm.reserved_until < timezone('utc'::text, now()))
    ORDER BY lpm.id
    LIMIT 1
    FOR UPDATE OF lpm SKIP LOCKED;

    IF v_membership_id IS NOT NULL THEN
        UPDATE public.lead_pack_memberships
        SET 
            reserved_until = timezone('utc'::text, now()) + interval '10 minutes',
            assigned_rep_id = p_rep_id
        WHERE id = v_membership_id;

        RETURN QUERY SELECT v_lead_id, v_membership_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
