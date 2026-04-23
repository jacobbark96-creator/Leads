"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading, initialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [profileCheckLoading, setProfileCheckLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkClientProfile = async () => {
      if (profile?.role === 'client') {
        try {
          const { data } = await supabase
            .from('clients')
            .select('is_profile_complete')
            .eq('user_id', profile.id)
            .single();
            
          if (data && !data.is_profile_complete) {
            setIsProfileComplete(false);
            if (pathname !== '/my-openlead') {
              router.push('/my-openlead');
            }
          } else {
            setIsProfileComplete(true);
          }
        } catch (error) {
          console.error("Error checking client profile completion", error);
        }
      } else {
        setIsProfileComplete(true);
      }
      setProfileCheckLoading(false);
    };

    if (mounted && initialized && !loading && profile) {
      checkClientProfile();
    } else if (initialized && !loading) {
      setProfileCheckLoading(false);
    }
  }, [mounted, initialized, loading, profile, pathname, router]);

  useEffect(() => {
    if (mounted && initialized && !loading && !profileCheckLoading) {
      if (!user || !profile) {
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(profile.role)) {
        // Redirect based on user's role if they try to access an unauthorized page
        if (profile.role === 'client') {
          router.push('/client-portal');
        } else {
          router.push('/staff');
        }
      }
    }
  }, [mounted, initialized, loading, profileCheckLoading, user, profile, router, allowedRoles]);

  if (!mounted || !initialized || loading || profileCheckLoading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (profile.role === 'client' && !isProfileComplete && pathname !== '/my-openlead') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Redirecting to profile setup...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
};