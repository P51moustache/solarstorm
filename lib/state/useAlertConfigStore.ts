import { create } from 'zustand';
import type { AlertConfig } from '@/lib/supabase/types';

interface AlertConfigState {
  config: AlertConfig | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConfig: () => void;
  updateConfig: (updates: Partial<Omit<AlertConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => void;
  resetToDefaults: () => void;
}

// Default values that match the AlertConfig interface
const DEFAULT_CONFIG: Omit<AlertConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  kp_threshold: 5,
  bz_threshold: -5,
  email_enabled: false,
  push_enabled: true,
  quiet_start: null,
  quiet_end: null,
};

const isClient = typeof window !== 'undefined';

// Local storage key
const LOCAL_STORAGE_KEY = 'solarstorm:alertConfig';

export const useAlertConfigStore = create<AlertConfigState>((set, get) => ({
  config: null,
  isLoading: false,
  error: null,

  fetchConfig: () => {
    set({ isLoading: true, error: null });

    try {
      // Use localStorage for alert config
      if (isClient) {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          set({ config: JSON.parse(stored), isLoading: false });
          return;
        }
      }

      // Return default config
      const defaultConfig: AlertConfig = {
        id: 'local',
        user_id: 'local',
        ...DEFAULT_CONFIG,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isClient) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultConfig));
      }

      set({ config: defaultConfig, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch alert config:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load alert settings',
        isLoading: false,
      });
    }
  },

  updateConfig: (updates) => {
    const { config } = get();
    if (!config) return;

    set({ isLoading: true, error: null });

    try {
      const updatedConfig: AlertConfig = {
        ...config,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (isClient) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedConfig));
      }

      set({ config: updatedConfig, isLoading: false });
    } catch (error) {
      console.error('Failed to update alert config:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to save alert settings',
        isLoading: false,
      });
    }
  },

  resetToDefaults: () => {
    const { config } = get();
    if (!config) return;

    const resetConfig: AlertConfig = {
      ...config,
      ...DEFAULT_CONFIG,
      updated_at: new Date().toISOString(),
    };

    if (isClient) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(resetConfig));
    }

    set({ config: resetConfig });
  },
}));
