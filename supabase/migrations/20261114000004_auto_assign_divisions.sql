-- Function to automatically assign division based on building_type
CREATE OR REPLACE FUNCTION auto_assign_lead_division()
RETURNS TRIGGER AS $$
DECLARE
    v_commercial_id UUID;
    v_residential_id UUID;
BEGIN
    -- Get division IDs
    SELECT id INTO v_commercial_id FROM public.divisions WHERE name = 'OpenEnergy' LIMIT 1;
    SELECT id INTO v_residential_id FROM public.divisions WHERE name = 'Open Energy residential' LIMIT 1;

    -- Assign based on building_type
    IF NEW.building_type ILIKE '%Residential%' THEN
        NEW.division_id := v_residential_id;
    ELSE
        -- Default to OpenEnergy for Commercial, null, or any other type
        NEW.division_id := v_commercial_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run before insert or update of building_type
DROP TRIGGER IF EXISTS trigger_auto_assign_lead_division ON public.leads;
CREATE TRIGGER trigger_auto_assign_lead_division
BEFORE INSERT OR UPDATE OF building_type
ON public.leads
FOR EACH ROW
EXECUTE FUNCTION auto_assign_lead_division();

-- ONE-TIME FIX: Retroactively update all existing leads in the database
DO $$
DECLARE
    v_commercial_id UUID;
    v_residential_id UUID;
BEGIN
    SELECT id INTO v_commercial_id FROM public.divisions WHERE name = 'OpenEnergy' LIMIT 1;
    SELECT id INTO v_residential_id FROM public.divisions WHERE name = 'Open Energy residential' LIMIT 1;

    -- Update existing residential leads
    UPDATE public.leads
    SET division_id = v_residential_id
    WHERE building_type ILIKE '%Residential%'
    AND (division_id IS NULL OR division_id != v_residential_id);

    -- Update existing commercial/other leads
    UPDATE public.leads
    SET division_id = v_commercial_id
    WHERE (building_type IS NULL OR building_type NOT ILIKE '%Residential%')
    AND (division_id IS NULL OR division_id != v_commercial_id);
END $$;
