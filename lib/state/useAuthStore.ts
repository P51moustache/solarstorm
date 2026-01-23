import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../supabase/client';
import type { Profile, SubscriptionTier } from '../supabase/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;

  // Derived
  tier: SubscriptionTier;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  tier: 'free',
  isAuthenticated: false,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session) {
        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        set({
          session,
          user: session.user,
          profile,
          tier: profile?.tier || 'free',
          isAuthenticated: true,
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          set({
            session,
            user: session.user,
            profile,
            tier: profile?.tier || 'free',
            isAuthenticated: true,
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            session: null,
            user: null,
            profile: null,
            tier: 'free',
            isAuthenticated: false,
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to initialize auth' });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign in' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign up' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithMagicLink: async (email: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/dashboard`
            : undefined,
        },
      });

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send magic link' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign out' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      set({
        profile,
        tier: profile?.tier || 'free',
      });
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
