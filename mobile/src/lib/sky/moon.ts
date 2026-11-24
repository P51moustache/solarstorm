/**
 * Tonight's Moon: its phase, how much is lit, and when it rises or sets during the night.
 * Pure and offline (astronomy-engine).
 */
import { Body, Illumination, MoonPhase, Observer, SearchRiseSet } from 'astronomy-engine';

import type { NightBounds, Place } from './darkness';

export interface MoonTonight {
  /** "Waxing gibbous", "Full moon"... */
  phaseName: string;
  /** Fraction of the disc lit, 0-1, at the start of the night. */
  illumination: number;
  /** Rise and set inside the night (sunset to sunrise); null when it does not happen tonight. */
  rise: Date | null;
  set: Date | null;
}

/** Degrees either side of new, first quarter, full and last quarter that still read as that exact phase. */
const PRINCIPAL_PHASE_TOLERANCE = 7;

const PRINCIPAL_PHASES: readonly { angle: number; name: string }[] = [
  { angle: 0, name: 'New moon' },
  { angle: 90, name: 'First quarter' },
  { angle: 180, name: 'Full moon' },
  { angle: 270, name: 'Last quarter' },
  { angle: 360, name: 'New moon' },
];

/** Name for a Moon phase angle (0 new, 90 first quarter, 180 full, 270 last quarter). */
export function moonPhaseName(angle: number): string {
  const a = ((angle % 360) + 360) % 360;
  const principal = PRINCIPAL_PHASES.find((p) => Math.abs(a - p.angle) <= PRINCIPAL_PHASE_TOLERANCE);
  if (principal) return principal.name;
  if (a < 90) return 'Waxing crescent';
  if (a < 180) return 'Waxing gibbous';
  if (a < 270) return 'Waning gibbous';
  return 'Waning crescent';
}

const DAY_MS = 86_400_000;

/** The Moon over `place` for the night in `bounds`. */
export function moonTonight(place: Place, bounds: NightBounds, now: Date): MoonTonight {
  const start = bounds.sunset ?? now;
  const end = bounds.sunrise ?? new Date(start.getTime() + DAY_MS);
  const spanDays = (end.getTime() - start.getTime()) / DAY_MS;
  const obs = new Observer(place.lat, place.lng, 0);
  const within = (direction: 1 | -1) => {
    const t = SearchRiseSet(Body.Moon, obs, direction, start, spanDays);
    return t && t.date.getTime() <= end.getTime() ? t.date : null;
  };
  return {
    phaseName: moonPhaseName(MoonPhase(start)),
    illumination: Illumination(Body.Moon, start).phase_fraction,
    rise: within(+1),
    set: within(-1),
  };
}
