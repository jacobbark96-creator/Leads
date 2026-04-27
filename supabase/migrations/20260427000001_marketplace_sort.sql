create or replace function get_local_marketplace_leads(p_client_id uuid, p_limit int, p_offset int, p_sort_by text default 'newest')
returns setof public.leads as $$
begin
    return query
    select l.*
    from public.leads l
    where l.status = 'qualified'
      and l.is_marketed = true
      and l.client_id is null
      and (
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
    order by 
      case when p_sort_by = 'lowest_price' then l.price end asc nulls last,
      case when p_sort_by = 'highest_price' then l.price end desc nulls last,
      case when p_sort_by = 'highest_spend' then l.monthly_spend end desc nulls last,
      case when p_sort_by = 'timeframe' then 
        case 
          when lower(l.timeframe) like '%asap%' then 1
          when lower(l.timeframe) like '%1-3%' then 2
          when lower(l.timeframe) like '%3-6%' then 3
          when lower(l.timeframe) like '%6+%' then 4
          else 5
        end
      end asc nulls last,
      l.created_at desc
    limit p_limit offset p_offset;
end;
$$ language plpgsql security definer;
