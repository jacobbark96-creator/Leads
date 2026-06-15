import { supabase } from './supabase';

export type ActivityType = 
  | 'view_lead' 
  | 'openlead_max_area_select' 
  | 'openlead_max_area_deselect' 
  | 'button_click' 
  | 'page_view'
  | 'purchase_lead';

export const trackClientActivity = async (
  userId: string,
  activityType: ActivityType,
  details: Record<string, any> = {}
) => {
  try {
    const { error } = await supabase
      .from('client_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        details
      });

    if (error) {
      console.error('Failed to track client activity:', error);
    }
  } catch (err) {
    console.error('Error in trackClientActivity:', err);
  }
};