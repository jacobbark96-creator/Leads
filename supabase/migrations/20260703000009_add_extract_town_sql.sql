-- Utility function to extract town from address in SQL
CREATE OR REPLACE FUNCTION public.extract_town(address TEXT) 
RETURNS TEXT AS $$
DECLARE
    clean TEXT;
    parts TEXT[];
BEGIN
    IF address IS NULL OR address = '' THEN RETURN 'Location TBC'; END IF;
    
    -- Remove UK/United Kingdom
    clean := regexp_replace(address, ',\s*(UK|United Kingdom)$', '', 'i');
    
    -- Remove Postcodes (UK format)
    clean := regexp_replace(clean, ',?\s*\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b', '', 'i');
    
    parts := string_to_array(clean, ',');
    
    IF array_length(parts, 1) > 1 THEN
        RETURN trim(parts[array_length(parts, 1)]);
    END IF;
    
    RETURN trim(parts[1]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
