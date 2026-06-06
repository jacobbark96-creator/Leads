-- Add distance calculation and local marketplace RPC
create or replace function calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric as $$
declare
    radius_earth_miles numeric := 3958.8;
    rlat1 numeric := radians(lat1);
    rlat2 numeric := radians(lat2);
    rlon1 numeric := radians(lon1);
    rlon2 numeric := radians(lon2);
    dlat numeric := rlat2 - rlat1;
    dlon numeric := rlon2 - rlon1;
    a numeric;
    c numeric;
begin
    if lat1 is null or lon1 is null or lat2 is null or lon2 is null then
        return null;
    end if;

    a := sin(dlat/2)^2 + cos(rlat1) * cos(rlat2) * sin(dlon/2)^2;
    c := 2 * asin(sqrt(a));
    return radius_earth_miles * c;
end;
$$ language plpgsql immutable;

create or replace function get_local_marketplace_leads(p_client_id uuid, p_limit int, p_offset int)
returns setof public.leads as $$
begin
    return query
    select l.*
    from public.leads l
    where l.status = 'qualified'
      and l.is_marketed = true
      and l.client_id is null
      and (
        -- If lead has no coordinates, we still show it (or hide it? Prompt says only show leads within area. Let's hide it if no coords, unless national? Better to show it if we can't determine, or hide. We will hide it if they are strictly local, to be safe. Actually, if national, show all.)
        exists (
            select 1
            from jsonb_array_elements((select service_areas from public.clients where id = p_client_id)) as sa(area)
            where 
                (sa.area->>'radiusMiles')::numeric = 99999
                or
                (
                    l.latitude is not null and l.longitude is not null
                    and sa.area->>'lat' is not null and sa.area->>'lng' is not null
                    and calculate_distance_miles(
                        l.latitude, 
                        l.longitude, 
                        (sa.area->>'lat')::numeric, 
                        (sa.area->>'lng')::numeric
                    ) <= (sa.area->>'radiusMiles')::numeric
                )
        )
      )
    order by l.created_at desc
    limit p_limit offset p_offset;
end;
$$ language plpgsql security definer;
