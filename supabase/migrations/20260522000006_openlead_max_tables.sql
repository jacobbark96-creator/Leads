-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Openlead Max Postcodes and Pricing
CREATE TABLE public.openlead_max_postcodes (
    area_code VARCHAR(10) PRIMARY KEY,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Openlead Max Availability/Locks for specific 2-week periods
CREATE TABLE public.openlead_max_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_code VARCHAR(10) REFERENCES public.openlead_max_postcodes(area_code) ON DELETE CASCADE,
    start_date DATE NOT NULL, -- Should be 1st or 14th
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(area_code, start_date)
);

-- Enable RLS
ALTER TABLE public.openlead_max_postcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openlead_max_availability ENABLE ROW LEVEL SECURITY;

-- Policies for postcodes
CREATE POLICY "Anyone can read postcode pricing" ON public.openlead_max_postcodes
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage postcode pricing" ON public.openlead_max_postcodes
    FOR ALL USING (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- Policies for availability
CREATE POLICY "Anyone can read availability" ON public.openlead_max_availability
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage availability" ON public.openlead_max_availability
    FOR ALL USING (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- Function to handle updated_at
CREATE TRIGGER set_updated_at_openlead_max_postcodes
BEFORE UPDATE ON public.openlead_max_postcodes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_openlead_max_availability
BEFORE UPDATE ON public.openlead_max_availability
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert some default UK postcode areas (simplified list for start)
INSERT INTO public.openlead_max_postcodes (area_code, base_price) VALUES
('AB', 500.00), ('AL', 500.00), ('B', 750.00), ('BA', 500.00), ('BB', 500.00), ('BD', 500.00), ('BH', 500.00), ('BL', 500.00), ('BN', 600.00), ('BR', 700.00),
('BS', 600.00), ('BT', 400.00), ('CA', 400.00), ('CB', 500.00), ('CF', 500.00), ('CH', 500.00), ('CM', 600.00), ('CO', 500.00), ('CR', 700.00), ('CT', 500.00),
('CV', 500.00), ('CW', 500.00), ('DA', 600.00), ('DD', 400.00), ('DE', 500.00), ('DG', 400.00), ('DH', 400.00), ('DL', 400.00), ('DN', 400.00), ('DT', 400.00),
('DY', 500.00), ('E', 1000.00), ('EC', 1200.00), ('EH', 600.00), ('EN', 700.00), ('EX', 400.00), ('FK', 400.00), ('FY', 400.00), ('G', 600.00), ('GL', 500.00),
('GU', 700.00), ('HA', 800.00), ('HD', 500.00), ('HG', 500.00), ('HP', 700.00), ('HR', 400.00), ('HS', 300.00), ('HU', 400.00), ('HX', 500.00), ('IG', 700.00),
('IP', 500.00), ('IV', 300.00), ('KA', 400.00), ('KT', 800.00), ('KW', 300.00), ('KY', 400.00), ('L', 600.00), ('LA', 400.00), ('LD', 300.00), ('LE', 500.00),
('LL', 400.00), ('LN', 400.00), ('LS', 600.00), ('LU', 600.00), ('M', 800.00), ('ME', 500.00), ('MK', 600.00), ('ML', 400.00), ('N', 1000.00), ('NE', 500.00),
('NG', 500.00), ('NN', 500.00), ('NP', 400.00), ('NR', 400.00), ('NW', 1000.00), ('OL', 500.00), ('OX', 700.00), ('PA', 400.00), ('PE', 400.00), ('PH', 300.00),
('PL', 400.00), ('PO', 500.00), ('PR', 500.00), ('RG', 700.00), ('RH', 600.00), ('RM', 600.00), ('S', 600.00), ('SA', 400.00), ('SE', 1000.00), ('SG', 600.00),
('SK', 600.00), ('SL', 800.00), ('SM', 700.00), ('SN', 500.00), ('SO', 600.00), ('SP', 500.00), ('SR', 400.00), ('SS', 600.00), ('ST', 400.00), ('SW', 1200.00),
('SY', 400.00), ('TA', 400.00), ('TD', 400.00), ('TF', 400.00), ('TN', 500.00), ('TQ', 400.00), ('TR', 400.00), ('TS', 400.00), ('TW', 800.00), ('UB', 800.00),
('W', 1200.00), ('WA', 600.00), ('WC', 1200.00), ('WD', 700.00), ('WF', 500.00), ('WN', 500.00), ('WR', 400.00), ('WS', 500.00), ('WV', 500.00), ('YO', 500.00),
('ZE', 300.00)
ON CONFLICT (area_code) DO NOTHING;
