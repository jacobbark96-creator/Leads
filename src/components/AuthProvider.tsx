'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { ActivityTracker } from './ActivityTracker';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <ActivityTracker />
      {children}
    </>
  );
}
