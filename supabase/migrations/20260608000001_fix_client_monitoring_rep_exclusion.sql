-- Fix: Exclude reps and staff from client monitoring stats
-- Only actual clients should appear in this tab

CREATE OR REPLACE FUNCTION get_client_monitoring_stats()
RETURNS TABLE (
    user_id UUID,
    company_name VARCHAR,
    last_login TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN,
    leads_viewed BIGINT,
    time_spent_24h_seconds BIGINT,
    top_lead_id UUID,
    top_lead_views BIGINT,
    top_lead_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH session_stats AS (
        SELECT 
            cs.user_id,
            MAX(cs.last_active_at) as last_login,
            MAX(cs.last_active_at) > (NOW() - INTERVAL '15 minutes') as is_online,
            COALESCE(SUM(cs.duration_seconds) FILTER (WHERE cs.session_start > (NOW() - INTERVAL '24 hours')), 0) as time_spent_24h_seconds
        FROM client_sessions cs
        WHERE cs.user_id IN (SELECT u.id FROM users u WHERE u.role = 'client')
        GROUP BY cs.user_id
    ),
    lead_views AS (
        SELECT 
            le.user_id,
            COUNT(DISTINCT le.lead_id) as leads_viewed
        FROM lead_events le
        WHERE le.event_type = 'view'
        AND le.user_id IN (SELECT u.id FROM users u WHERE u.role = 'client')
        GROUP BY le.user_id
    ),
    top_leads AS (
        SELECT 
            le.user_id,
            le.lead_id,
            COUNT(*) as view_count,
            ROW_NUMBER() OVER(PARTITION BY le.user_id ORDER BY COUNT(*) DESC) as rn
        FROM lead_events le
        WHERE le.event_type = 'view'
        AND le.user_id IN (SELECT u.id FROM users u WHERE u.role = 'client')
        GROUP BY le.user_id, le.lead_id
    )
    SELECT 
        u.id as user_id,
        COALESCE(c.company_name, u.name)::VARCHAR as company_name,
        s.last_login,
        COALESCE(s.is_online, false) as is_online,
        COALESCE(v.leads_viewed, 0) as leads_viewed,
        COALESCE(s.time_spent_24h_seconds, 0)::BIGINT as time_spent_24h_seconds,
        tl.lead_id as top_lead_id,
        tl.view_count as top_lead_views,
        COALESCE(l.company, 'Lead #' || SUBSTRING(tl.lead_id::text, 1, 8))::VARCHAR as top_lead_name
    FROM users u
    JOIN clients c ON c.user_id = u.id
    LEFT JOIN session_stats s ON s.user_id = u.id
    LEFT JOIN lead_views v ON v.user_id = u.id
    LEFT JOIN top_leads tl ON tl.user_id = u.id AND tl.rn = 1
    LEFT JOIN leads l ON l.id = tl.lead_id
    WHERE u.role = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
