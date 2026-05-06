CREATE OR REPLACE FUNCTION get_lead_ids_in_radius(
    search_lat NUMERIC,
    search_lng NUMERIC,
    radius_miles NUMERIC
)
RETURNS TABLE (id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT l.id
    FROM leads l
    WHERE 
        l.latitude IS NOT NULL
        AND l.longitude IS NOT NULL
        AND (
            3958.8 * 2 * atan2(
                sqrt(
                    sin(radians(l.latitude - search_lat) / 2) * sin(radians(l.latitude - search_lat) / 2) +
                    cos(radians(search_lat)) * cos(radians(l.latitude)) *
                    sin(radians(l.longitude - search_lng) / 2) * sin(radians(l.longitude - search_lng) / 2)
                ),
                sqrt(1 - (
                    sin(radians(l.latitude - search_lat) / 2) * sin(radians(l.latitude - search_lat) / 2) +
                    cos(radians(search_lat)) * cos(radians(l.latitude)) *
                    sin(radians(l.longitude - search_lng) / 2) * sin(radians(l.longitude - search_lng) / 2)
                ))
            )
        ) <= radius_miles;
END;
$$ LANGUAGE plpgsql;