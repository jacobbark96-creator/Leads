"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading, initialized } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && initialized && !loading) {
      if (!user || !profile) {
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(profile.role)) {
        // Redirect based on user's role if they try to access an unauthorized page
        switch (profile.role) {
          case 'client': router.push('/client-portal'); break;
          case 'sales': router.push('/sales-crm'); break;
          case 'admin':
          case 'super_admin': router.push('/admin-crm'); break;
          default: router.push('/intranet'); break;
        }
      }
    }
  }, [mounted, initialized, loading, user, profile, router, allowedRoles]);

  if (!mounted || !initialized || loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
};