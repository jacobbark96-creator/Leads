'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { ActivityTracker } from './ActivityTracker';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();

    // Handle ChunkLoadError to recover from stale deployments
    const handleError = (e: ErrorEvent) => {
      if (
        e.message?.includes('ChunkLoadError') || 
        e.message?.includes('Loading chunk') ||
        e.error?.name === 'ChunkLoadError'
      ) {
        console.warn('ChunkLoadError detected, reloading page to fetch latest assets...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [initialize]);

  return (
    <>
      <ActivityTracker />
      {children}
    </>
  );
}
