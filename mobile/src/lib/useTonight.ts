/**
 * Tonight for one place: fetches the cloud forecast, reads the shared space-weather feed for the
 * aurora, and runs the pure `planTonight`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { auroraProbability } from '@/lib/aurora';
import { useSky } from '@/lib/sky';
import { localClock } from '@/lib/sky/clock';
import type { AuroraRead } from '@/lib/sky/events/types';
import { planTonight, type Tonight } from '@/lib/sky/tonight';
import { getSkyWeather, type SkyWeather } from '@/lib/sky/weather';
import type { PlaceChoice } from '@/lib/tonightPlace';

export interface TonightState {
  tonight: Tonight | null;
  /** True while the forecast for the current place is loading. */
  loading: boolean;
  /** False when the forecast could not be fetched; the plan then has no clouds. */
  hasForecast: boolean;
  refresh: () => Promise<void>;
}

export function useTonight(place: PlaceChoice | null): TonightState {
  const { conditions, refresh: refreshSky } = useSky();
  const [weather, setWeather] = useState<SkyWeather[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const lat = place?.lat;
  const lng = place?.lng;
  const load = useCallback(async () => {
    if (lat === undefined || lng === undefined) return;
    setLoading(true);
    setWeather(await getSkyWeather(lat, lng));
    setNow(new Date());
    setLoading(false);
  }, [lat, lng]);

  useEffect(() => {
    setWeather(null);
    load();
  }, [load]);

  const kp = conditions?.kp ?? null;
  const bz = conditions?.solarWind.bz ?? null;
  const speed = conditions?.solarWind.speed ?? null;
  const aurora: AuroraRead | null = useMemo(
    () =>
      lat !== undefined && lng !== undefined && kp !== null
        ? { probability: auroraProbability(lat, lng, kp, bz, speed).probability, kp }
        : null,
    [lat, lng, kp, bz, speed]
  );

  const tonight = useMemo(
    () =>
      lat !== undefined && lng !== undefined
        ? planTonight({ place: { lat, lng }, weather: weather ?? [], now, aurora, clock: localClock })
        : null,
    [lat, lng, weather, now, aurora]
  );

  const refresh = useCallback(async () => {
    await Promise.all([load(), refreshSky()]);
  }, [load, refreshSky]);

  return { tonight, loading, hasForecast: weather !== null && weather.length > 0, refresh };
}
