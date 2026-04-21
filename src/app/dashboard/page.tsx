"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, profile, loading, initialized } = useAuthStore();

  useEffect(() => {
    if (initialized && !loading) {
      if (!user || !profile) {
        router.replace('/login');
      } else {
        if (profile.role === 'client') {
          router.replace('/client-portal');
        } else {
          router.replace('/staff');
        }
      }
    }
  }, [user, profile, loading, initialized, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}