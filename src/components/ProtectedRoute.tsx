"use client";
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading, initialized } = useAuthStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [profileCheckLoading, setProfileCheckLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkClientProfile = async () => {
      // If we don't have a profile yet, we can't check completion
      if (!profile) {
        setProfileCheckLoading(false);
        return;
      }

      if (profile.role === 'client') {
        try {
          const { data, error } = await supabase
            .from('clients')
            .select('is_profile_complete')
            .eq('user_id', profile.id)
            .single();
            
          if (error) {
            // If the row doesn't exist (PGRST116 means zero rows returned)
            if (error.code === 'PGRST116') {
              setIsProfileComplete(false);
              if (pathname !== '/my-openlead') {
                window.location.href = '/my-openlead';
              }
              setProfileCheckLoading(false);
              return;
            }
            throw error;
          }

          if (data && !data.is_profile_complete) {
            setIsProfileComplete(false);
            if (pathname !== '/my-openlead') {
              window.location.href = '/my-openlead';
            }
          } else {
            setIsProfileComplete(true);
          }
        } catch (error) {
          console.error("Error checking client profile completion:", error);
          // Default to true on error to avoid blocking the user
          setIsProfileComplete(true);
        }
      } else {
        setIsProfileComplete(true);
      }
      setProfileCheckLoading(false);
    };

    if (mounted && initialized && !loading) {
      checkClientProfile();
    }
  }, [mounted, initialized, loading, profile?.id, pathname]);

  useEffect(() => {
    if (mounted && initialized && !loading && !profileCheckLoading) {
      if (!user || !profile) {
        window.location.href = '/login';
      } else if (profile.role === 'client' && profile.is_approved === false) {
        window.location.href = '/pending-approval';
      } else if (allowedRoles && !allowedRoles.includes(profile.role)) {
        // Redirect based on user's role if they try to access an unauthorized page
        if (profile.role === 'client') {
          window.location.href = '/my-openlead';
        } else {
          window.location.href = '/staff';
        }
      }
    }
  }, [mounted, initialized, loading, profileCheckLoading, user, profile, allowedRoles]);

  // Show loading spinner only during initial initialization
  if (!mounted || (!initialized && loading) || (initialized && loading && !profile) || profileCheckLoading) {
    // If we've been loading for more than 5 seconds after mount, something is wrong
    // Let's try to force an initialization check
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 text-sm animate-pulse">Loading your dashboard...</p>
          {mounted && initialized && (
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 text-xs text-blue-500 underline"
            >
              Taking too long? Click to refresh
            </button>
          )}
        </div>
      </div>
    );
  }

  // If we're initialized but have no user/profile, we're about to redirect
  if (!user || !profile) {
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