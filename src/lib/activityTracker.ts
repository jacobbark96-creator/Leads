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
    let deviceType = 'desktop';
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        deviceType = 'mobile';
      } else if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        deviceType = 'tablet';
      }
    }

    const { error } = await supabase
      .from('client_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        details: { ...details, deviceType }
      });

    if (error) {
      console.error('Failed to track client activity:', error);
    }
  } catch (err) {
    console.error('Error in trackClientActivity:', err);
  }
};