/**
 * Tonight for one place: fetches the cloud forecast, reads the shared space-weather feed for the
 * aurora, and runs the pure `planTonight`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { auroraProbability } from '@/lib/aurora';
import { useSky } from '@/lib/sky';
import { deviceOffsetSeconds, offsetClock, placeDate, type Clock } from '@/lib/sky/clock';
import type { AuroraRead } from '@/lib/sky/events/types';
import { planTonight, type Tonight } from '@/lib/sky/tonight';
import { getSkyForecast, type SkyForecast } from '@/lib/sky/weather';
import type { PlaceChoice } from '@/lib/tonightPlace';

export interface TonightState {
  tonight: Tonight | null;
  /** Reads times in the place's own time zone (the device's until the forecast says otherwise). */
  clock: Clock;
  /** "Mon, Nov 23": the night's date at the place. */
  dateLabel: string;
  /** True while the forecast for the current place is loading. */
  loading: boolean;
  /** False when the forecast could not be fetched; the plan then has no clouds. */
  hasForecast: boolean;
  refresh: () => Promise<void>;
}

export function useTonight(place: PlaceChoice | null): TonightState {
  const { conditions, refresh: refreshSky } = useSky();
  const [forecast, setForecast] = useState<SkyForecast | null>(null);
  const [loading, setLoading] = useState(false);
  /** True once the forecast fetch for the current place has finished (or failed). */
  const [settled, setSettled] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const lat = place?.lat;
  const lng = place?.lng;
  const load = useCallback(async () => {
    if (lat === undefined || lng === undefined) return;
    setLoading(true);
    setForecast(await getSkyForecast(lat, lng));
    setNow(new Date());
    setSettled(true);
    setLoading(false);
  }, [lat, lng]);

  useEffect(() => {
    setForecast(null);
    setSettled(false);
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
    [lat, lng, kp, bz, speed],
  );

  const offset = forecast?.utcOffsetSeconds ?? deviceOffsetSeconds(now);
  const clock = useMemo(() => offsetClock(offset), [offset]);

  const tonight = useMemo(
    () =>
      // Wait for the first fetch: a plan made before it has no clouds and the device's time zone,
      // so its score and times would jump when the forecast lands.
      settled && lat !== undefined && lng !== undefined
        ? planTonight({ place: { lat, lng }, weather: forecast?.hours ?? [], now, aurora, clock })
        : null,
    [settled, lat, lng, forecast, now, aurora, clock],
  );
  const dateLabel = placeDate(tonight?.plan.bounds.sunset ?? now, offset);

  const refresh = useCallback(async () => {
    await Promise.all([load(), refreshSky()]);
  }, [load, refreshSky]);

  return { tonight, clock, dateLabel, loading, hasForecast: forecast !== null, refresh };
}
