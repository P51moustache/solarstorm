import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  tier: string;
  initializing: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

async function fetchTier(userId: string): Promise<string> {
  const { data } = await supabase.from('profiles').select('tier').eq('id', userId).single();
  return data?.tier ?? 'free';
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  tier: 'free',
  initializing: true,
  error: null,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const tier = session ? await fetchTier(session.user.id) : 'free';
    set({ session, tier, initializing: false });

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const newTier = newSession ? await fetchTier(newSession.user.id) : 'free';
      set({ session: newSession, tier: newTier });
    });
  },

  signIn: async (email, password) => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      throw error;
    }
  },

  signUp: async (email, password) => {
    set({ error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message });
      throw error;
    }
    // Supabase returns a fake user (empty identities) when the email already exists.
    if (!data.user || data.user.identities?.length === 0) {
      const msg = 'This email may already be registered.';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, tier: 'free' });
  },

  clearError: () => set({ error: null }),
}));
