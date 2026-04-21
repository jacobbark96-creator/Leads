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
        switch (profile.role) {
          case 'client': router.replace('/client-portal'); break;
          case 'sales': router.replace('/sales-crm'); break;
          case 'admin':
          case 'super_admin': router.replace('/admin-crm'); break;
          default: router.replace('/intranet'); break;
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