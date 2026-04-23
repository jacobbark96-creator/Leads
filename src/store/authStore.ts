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
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      initialize: async () => {
        // Prevent multiple initializations
        if (get().initialized) return;

        // If we already have a cached profile, stop the loading spinner instantly
        // This gives the user an incredibly fast perceived load time
        if (get().profile) {
          set({ loading: false });
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            set({ user: session.user });
            
            // Fetch user profile to ensure it's up to date
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profile) {
              set({ profile });
            }
          } else {
            // Clear cached profile if session is actually invalid
            set({ user: null, profile: null });
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
        } finally {
          set({ loading: false, initialized: true });
        }

        // Set up auth listener only once
        supabase.auth.onAuthStateChange(async (event, session) => {
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
        set({ user: null, profile: null });
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