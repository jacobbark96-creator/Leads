'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function ActivityTracker() {
  const { profile } = useAuthStore();
  const trackingIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Only track clients, sales, and admins? Actually tracking everyone is fine, 
    // but the requirement is "Client Monitoring". We'll track all logged-in users.
    if (!profile) return;

    const trackActivity = async () => {
      try {
        await supabase.rpc('track_client_activity', { p_user_id: profile.id });
      } catch (err) {
        console.error('Failed to track activity', err);
      }
    };

    // Track immediately on mount/login
    trackActivity();

    // Set up interval to track every minute
    trackingIntervalRef.current = setInterval(trackActivity, 60000);

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [profile]);

  return null;
}
