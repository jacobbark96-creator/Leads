import { supabase } from '../lib/supabase';

export type LeadEventType = 'view' | 'order_summary' | 'checkout';

export const trackLeadEvent = async (leadId: string, userId: string, eventType: LeadEventType) => {
  try {
    const { error } = await supabase
      .from('lead_events')
      .insert({
        lead_id: leadId,
        user_id: userId,
        event_type: eventType
      });
      
    if (error) {
      console.error(`Failed to track lead event (${eventType})`, error);
    }
  } catch (err) {
    console.error(`Error tracking lead event (${eventType})`, err);
  }
};
