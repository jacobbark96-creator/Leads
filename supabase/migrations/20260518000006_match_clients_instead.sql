drop function if exists get_matched_contractors_for_lead(uuid);

create or replace function get_matched_contractors_for_lead(p_lead_id uuid)
returns setof public.clients as $$
declare
    v_lead public.leads;
    v_cat_name text;
begin
    select * into v_lead from public.leads where id = p_lead_id;
    
    if not found then
        return;
    end if;

    if v_lead.category_id is not null then
        select name into v_cat_name from public.categories where id = v_lead.category_id;
    end if;

    return query
    select c.*
    from public.clients c
    where c.phone is not null
      and c.service_areas is not null
      and (
          (v_lead.category_id is not null and c.services_offered ilike '%' || v_lead.category_id || '%')
          or
          (v_cat_name is not null and c.services_offered ilike '%' || v_cat_name || '%')
      )
      and exists (
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
        );
end;
$$ language plpgsql security definer;
