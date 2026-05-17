import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  isInitializing: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,
      initialized: false,
      isInitializing: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      initialize: async () => {
        // Prevent multiple simultaneous initializations
        if (get().isInitializing || get().initialized) return;
        
        set({ isInitializing: true });

        // Add a safety timeout to ensure we don't stay in loading state forever
        const timeout = setTimeout(() => {
          if (get().loading || !get().initialized) {
            console.warn('Auth initialization timed out, forcing loading to false');
            set({ loading: false, initialized: true, isInitializing: false });
          }
        }, 8000); // 8 second safety timeout

        // If we already have a cached profile, we can consider ourselves "initialized" 
        // enough to show the UI while we refresh data in the background.
        if (get().profile) {
          set({ loading: false, initialized: true });
        }

        try {
          // Get current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error during init:', sessionError);
            // If it's a refresh token error, clear everything and force a clean state
            if (sessionError.message.includes('Refresh Token Not Found') || 
                sessionError.message.includes('invalid_grant') ||
                sessionError.message.includes('refresh_token_not_found')) {
              set({ user: null, profile: null, loading: false, initialized: true, isInitializing: false });
              // Clear local storage manually to be sure
              if (typeof window !== 'undefined') {
                localStorage.removeItem('auth-storage');
                supabase.auth.signOut();
              }
              return;
            }
          }

          if (session?.user) {
            set({ user: session.user });
            
            // Fetch user profile to ensure it's up to date
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              // If profile not found, maybe it's a new user or auth/db mismatch
            }

            if (profile) {
              set({ profile });
            }
          } else {
            // Clear cached profile if session is actually invalid
            set({ user: null, profile: null });
          }
        } catch (error: any) {
          console.error('Error initializing auth:', error);
          if (error.message?.includes('Refresh Token Not Found')) {
            set({ user: null, profile: null });
          }
        } finally {
          clearTimeout(timeout);
          set({ loading: false, initialized: true, isInitializing: false });
        }

        // Set up auth listener only once
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
            // Handle specific events if needed
          }

          if (session?.user) {
            set({ user: session.user });
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profile) {
              set({ profile });
            }
          } else {
            set({ user: null, profile: null });
          }
        });
      },
      signOut: async () => {
        // Optimistically clear the state so the UI reacts instantly
        set({ user: null, profile: null, initialized: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Error during sign out:', error);
        }
        // Force a hard reload to clear any residual cache or router state
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, profile: state.profile }), // Only cache user and profile
    }
  )
);