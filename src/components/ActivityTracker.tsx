'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function ActivityTracker() {
  const { profile } = useAuthStore();

  useEffect(() => {
    // Only track clients, sales, and admins? Actually tracking everyone is fine, 
    // but the requirement is "Client Monitoring". We'll track all logged-in users.
    if (!profile?.id) return;

    let mounted = true;

    const trackActivity = async () => {
      if (!mounted) return;
      try {
        await supabase.rpc('track_client_activity', { p_user_id: profile.id });
      } catch (err) {
        console.error('Failed to track activity', err);
      }
    };

    // Track immediately on mount/login
    trackActivity();

    // Set up interval to track every minute
    const interval = setInterval(trackActivity, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [profile?.id]);

  return null;
}
