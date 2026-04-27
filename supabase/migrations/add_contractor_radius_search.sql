-- Create a simple function to calculate distance using Haversine formula in miles
CREATE OR REPLACE FUNCTION get_contractor_ids_in_radius(
    search_lat NUMERIC,
    search_lng NUMERIC,
    radius_miles NUMERIC
)
RETURNS TABLE (id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id
    FROM contractors c
    WHERE 
        c.status != 'onboarded'
        AND NULLIF(c.csv_data->>'Latitude', '') IS NOT NULL
        AND NULLIF(c.csv_data->>'Longitude', '') IS NOT NULL
        AND (
            3958.8 * 2 * atan2(
                sqrt(
                    sin(radians(NULLIF(c.csv_data->>'Latitude', '')::NUMERIC - search_lat) / 2) * sin(radians(NULLIF(c.csv_data->>'Latitude', '')::NUMERIC - search_lat) / 2) +
                    cos(radians(search_lat)) * cos(radians(NULLIF(c.csv_data->>'Latitude', '')::NUMERIC)) *
                    sin(radians(NULLIF(c.csv_data->>'Longitude', '')::NUMERIC - search_lng) / 2) * sin(radians(NULLIF(c.csv_data->>'Longitude', '')::NUMERIC - search_lng) / 2)
                ),
                sqrt(1 - (
                    sin(radians(NULLIF(c.csv_data->>'Latitude', '')::NUMERIC - search_lat) / 2) * sin(radians(NULLIF(c.csv_data->>'Latitude', '')::NUMERIC - search_lat) / 2) +
                    cos(radians(search_lat)) * cos(radians(NULLIF(c.csv_data->>'Latitude', '')::NUMERIC)) *
                    sin(radians(NULLIF(c.csv_data->>'Longitude', '')::NUMERIC - search_lng) / 2) * sin(radians(NULLIF(c.csv_data->>'Longitude', '')::NUMERIC - search_lng) / 2)
                ))
            )
        ) <= radius_miles;
END;
$$ LANGUAGE plpgsql;
