create or replace function get_matched_contractors_for_lead(p_lead_id uuid)
returns setof public.contractors as $$
declare
    v_lead public.leads;
begin
    select * into v_lead from public.leads where id = p_lead_id;
    
    if not found then
        return;
    end if;

    return query
    select c.*
    from public.contractors c
    where c.status = 'active'
      and c.phone is not null
      and (c.category_id is null or c.category_id = v_lead.category_id)
      and (
        c.service_areas is null 
        or jsonb_array_length(c.service_areas) = 0
        or exists (
            select 1
            from jsonb_array_elements(c.service_areas) as sa(area)
            where 
                (sa.area->>'radiusMiles')::numeric = 99999
                or
                (
                    v_lead.latitude is not null and v_lead.longitude is not null
                    and sa.area->>'lat' is not null and sa.area->>'lng' is not null
                    and calculate_distance_miles(
                        v_lead.latitude, 
                        v_lead.longitude, 
                        (sa.area->>'lat')::numeric, 
                        (sa.area->>'lng')::numeric
                    ) <= (sa.area->>'radiusMiles')::numeric
                )
        )
      );
end;
$$ language plpgsql security definer;
