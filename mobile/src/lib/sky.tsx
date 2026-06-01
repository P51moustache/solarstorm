import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { skyMood } from '@/constants/solar';
import { CurrentConditions, getCurrentConditions } from '@/lib/spaceWeather';

const CACHE_KEY = 'solarstorm.lastConditions.v1';

interface SkyState {
  conditions: CurrentConditions | null;
  loading: boolean;
  mood: ReturnType<typeof skyMood>;
  refresh: () => Promise<void>;
}

const SkyContext = createContext<SkyState | undefined>(undefined);

/**
 * Shared live-conditions provider. Drives the global aurora backdrop and is
 * reused by the Dashboard so the visuals and the numbers always agree.
 */
export function SkyProvider({ children }: { children: ReactNode }) {
  const [conditions, setConditions] = useState<CurrentConditions | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const c = await getCurrentConditions();
      setConditions(c);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(c)).catch(() => {});
    } catch {
      // Keep last-known conditions; the backdrop simply holds its current mood.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Show last-known conditions instantly (offline / cold start), then refresh.
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) setConditions((prev) => prev ?? (JSON.parse(raw) as CurrentConditions));
      })
      .catch(() => {})
      .finally(refresh);
  }, [refresh]);

  const mood = skyMood(conditions?.kp ?? null, conditions?.solarWind.bz ?? null);

  return (
    <SkyContext.Provider value={{ conditions, loading, mood, refresh }}>
      {children}
    </SkyContext.Provider>
  );
}

export function useSky(): SkyState {
  const ctx = useContext(SkyContext);
  if (!ctx) throw new Error('useSky must be used within SkyProvider');
  return ctx;
}
