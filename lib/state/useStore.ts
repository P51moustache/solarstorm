import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SwpcAlert } from '../api/parsers/alerts';
import { clearCache, getAlerts, getKpNow, getOvation, getSolarWindRecent } from '../api/swpc';
import { asyncStorage } from './persist';

export interface SolarStormState {
  // Data
  kp: number | null;
  kpUpdatedAt: string | null;
  bz: number | null;
  speed: number | null;
  density: number | null;
  swUpdatedAt: string | null;
  ovationUpdatedAt: string | null;
  alerts: SwpcAlert[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Settings
  kpThreshold: 4 | 5 | 6 | 0; // 0 = off
  requireBzGate: boolean;
  lastAlertAt: string | null;
  
  // Actions
  refreshAll: () => Promise<void>;
  refreshKP: () => Promise<void>;
  refreshSW: () => Promise<void>;
  refreshOvation: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  setKpThreshold: (threshold: 4 | 5 | 6 | 0) => void;
  toggleBzGate: () => void;
  setLastAlertAt: (timestamp: string) => void;
  resetCache: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useSolarStormStore = create<SolarStormState>()(
  persist(
    (set, get) => ({
      // Initial state
      kp: null,
      kpUpdatedAt: null,
      bz: null,
      speed: null,
      density: null,
      swUpdatedAt: null,
      ovationUpdatedAt: null,
      alerts: [],
      isLoading: false,
      error: null,
      kpThreshold: 5,
      requireBzGate: true,
      lastAlertAt: null,

      // Actions
      refreshAll: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await Promise.all([
            get().refreshKP(),
            get().refreshSW(),
            get().refreshOvation(),
            get().refreshAlerts(),
          ]);
        } catch (error) {
          console.error('Failed to refresh all data:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to refresh data' });
        } finally {
          set({ isLoading: false });
        }
      },

      refreshKP: async () => {
        try {
          const data = await getKpNow();
          set({
            kp: data.kp,
            kpUpdatedAt: data.at,
            error: null,
          });
        } catch (error) {
          console.error('Failed to refresh Kp:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to refresh Kp' });
        }
      },

      refreshSW: async () => {
        try {
          const data = await getSolarWindRecent();
          const points = data.points || [];
          if (points.length === 0) return;

          const reversed = [...points].reverse();
          const latestBz = reversed.find(p => p.bz !== null) || null;
          const latestSpeed = reversed.find(p => p.speed !== null) || null;
          const latestDensity = reversed.find(p => p.density !== null) || null;

          const swUpdatedAtCandidates = [
            latestBz?.at,
            latestSpeed?.at,
            latestDensity?.at,
            points[points.length - 1]?.at,
          ].filter(Boolean) as string[];
          const swUpdatedAt = swUpdatedAtCandidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

          set({
            bz: latestBz ? (latestBz.bz as number) : null,
            speed: latestSpeed ? (latestSpeed.speed as number) : null,
            density: latestDensity ? (latestDensity.density as number) : null,
            swUpdatedAt,
            error: null,
          });
        } catch (error) {
          console.error('Failed to refresh solar wind:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to refresh solar wind' });
        }
      },

      refreshOvation: async () => {
        try {
          const data = await getOvation();
          set({
            ovationUpdatedAt: data.updated,
            error: null,
          });
        } catch (error) {
          console.error('Failed to refresh OVATION:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to refresh aurora data' });
        }
      },

      refreshAlerts: async () => {
        try {
          const alerts = await getAlerts();
          set({
            alerts,
            error: null,
          });
        } catch (error) {
          console.error('Failed to refresh alerts:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to refresh alerts' });
        }
      },

      setKpThreshold: (threshold) => {
        set({ kpThreshold: threshold });
      },

      toggleBzGate: () => {
        set((state) => ({ requireBzGate: !state.requireBzGate }));
      },

      setLastAlertAt: (timestamp) => {
        set({ lastAlertAt: timestamp });
      },

      resetCache: async () => {
        try {
          await clearCache();
          set({
            kp: null,
            kpUpdatedAt: null,
            bz: null,
            speed: null,
            density: null,
            swUpdatedAt: null,
            ovationUpdatedAt: null,
            alerts: [],
            error: null,
          });
        } catch (error) {
          console.error('Failed to reset cache:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to reset cache' });
        }
      },

      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: 'solarstorm-storage',
      storage: createJSONStorage(() => asyncStorage),
      partialize: (state) => ({
        // Only persist settings and some metadata
        kpThreshold: state.kpThreshold,
        requireBzGate: state.requireBzGate,
        lastAlertAt: state.lastAlertAt,
      }),
    }
  )
);

// Derived selectors
export const useAuroraChance = () => {
  return useSolarStormStore((state) => {
    const { kp, bz, speed } = state;
    
    if (kp === null || bz === null || speed === null) {
      return 'Fetching data...';
    }
    
    if (kp >= 5 && bz <= -5 && speed >= 500) {
      return 'High chance at mid-latitudes';
    } else if (kp >= 4 && bz <= -3) {
      return 'Possible at higher latitudes';
    } else {
      return 'Low likelihood; watch for drops in Bz';
    }
  });
};

export const useLatestUpdateTime = () => {
  return useSolarStormStore((state) => {
    const times = [
      state.kpUpdatedAt,
      state.swUpdatedAt,
    ].filter(Boolean);
    
    if (times.length === 0) return null;
    
    // Return the most recent timestamp
    return times.sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]!;
  });
};
