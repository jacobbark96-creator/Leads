-- Create a dedicated function to handle new lead notifications for clients based on their service area
-- This avoids duplicates and filters by location/relevance
CREATE OR REPLACE FUNCTION public.notify_clients_of_new_lead()
RETURNS TRIGGER AS $$
DECLARE
    v_client RECORD;
    v_lead_town TEXT;
BEGIN
    -- Only trigger if the lead is newly marketed
    IF NEW.is_marketed = true AND (TG_OP = 'INSERT' OR OLD.is_marketed = false) THEN
        
        -- Get lead town for better notification content
        v_lead_town := public.extract_town(NEW.location);

        -- Loop through all clients who match this lead's area/category
        -- Reusing the logic from get_matched_contractors_for_lead
        FOR v_client IN 
            SELECT * FROM public.get_matched_contractors_for_lead(NEW.id)
        LOOP
            -- Prevent duplicate "new lead" notifications for the same lead and user
            -- Using data->>'lead_id' to check for existing entries
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = v_client.user_id 
                AND data->>'type' = 'system'
                AND data->>'lead_id' = NEW.id::text
            ) THEN
                INSERT INTO public.notifications (
                    user_id, 
                    title, 
                    body, 
                    data
                )
                VALUES (
                    v_client.user_id,
                    'New Lead in ' || v_lead_town,
                    'A new lead in ' || v_lead_town || ' matches your working area. Click to view on marketplace.',
                    jsonb_build_object(
                        'type', 'system',
                        'lead_id', NEW.id,
                        'location', v_lead_town,
                        'category_id', NEW.category_id,
                        'target_url', '/marketplace'
                    )
                );
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the leads table
DROP TRIGGER IF EXISTS notify_clients_lead_trigger ON public.leads;
CREATE TRIGGER notify_clients_lead_trigger
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_clients_of_new_lead();

-- Remove the old inaccurate trigger if it exists (from the user's provided summary/previous state)
DROP TRIGGER IF EXISTS notification ON public.lead_purchases;
DROP FUNCTION IF EXISTS public.notify_on_lead_purchase();
