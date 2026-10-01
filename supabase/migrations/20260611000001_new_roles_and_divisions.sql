-- 1. Update users role check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('client', 'sales', 'admin', 'super_admin', 'rep', 'growth_manager', 'Residential Rep', 'Residential Sales', 'Commercial Sales'));

-- 2. Add lead_type and division_id to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_type TEXT CHECK (lead_type IN ('residential', 'commercial')) DEFAULT 'commercial';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sales_pipeline_status TEXT CHECK (sales_pipeline_status IN ('Upcoming', 'Pitched', 'No Show', 'Sold', 'Lost'));

-- 3. Insert new division
INSERT INTO public.divisions (name) VALUES ('Open Energy residential') ON CONFLICT (name) DO NOTHING;

-- 4. Update existing leads to be 'commercial' and in 'OpenEnergy' division
DO $$
DECLARE
    v_openenergy_id UUID;
BEGIN
    SELECT id INTO v_openenergy_id FROM public.divisions WHERE name = 'OpenEnergy' LIMIT 1;
    IF v_openenergy_id IS NOT NULL THEN
        UPDATE public.leads SET division_id = v_openenergy_id WHERE division_id IS NULL;
    END IF;
END $$;
