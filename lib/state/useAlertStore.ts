import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../supabase/client';
import type { AlertConfig } from '../supabase/types';
import { asyncStorage } from './persist';

interface AlertState {
  config: AlertConfig | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<AlertConfig>) => Promise<void>;
  testAlert: () => Promise<void>;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      config: null,
      isLoading: false,
      error: null,

      fetchConfig: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('alert_configs')
            .select('*')
            .eq('user_id', user.id)
            .single();

          // PGRST116 = no rows found, which is fine for new users
          if (error && error.code !== 'PGRST116') throw error;

          set({ config: data as AlertConfig | null, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch alert config',
            isLoading: false,
          });
        }
      },

      updateConfig: async (updates) => {
        const { config } = get();
        if (!config) return;

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('alert_configs')
            .update(updates as unknown as never)
            .eq('id', config.id);

          if (error) throw error;

          set({
            config: { ...config, ...updates } as AlertConfig,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update config',
            isLoading: false,
          });
        }
      },

      testAlert: async () => {
        // Send test notification
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          await supabase.functions.invoke('send-test-alert', {
            body: { userId: user.id },
          });
        } catch (error) {
          console.error('Failed to send test alert:', error);
        }
      },
    }),
    {
      name: 'alert-storage',
      storage: createJSONStorage(() => asyncStorage),
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);
