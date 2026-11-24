/**
 * Tonight's plan: the sky sampled from sunset to sunrise, scored, with its best window.
 * This is the answer to "when is the sky good tonight" that screens and alerts read.
 */
import { findBestWindow, type SkyWindow } from './bestWindow';
import { nightBounds, skyAt, type NightBounds, type Place, type SkyState } from './darkness';
import { scoreSky, type SkyScore } from './skyScore';
import { weatherAt, type SkyWeather } from './weather';

/** Minutes between samples: fine enough for a window like "22:10 to 03:40". */
export const SAMPLE_MINUTES = 10;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
/** Searching for the next night from this long after a sunrise lands in the following afternoon. */
const NEXT_NIGHT_GAP_MS = 6 * 3_600_000;

/** One sampled moment of the night. */
export interface NightSample extends SkyScore {
  time: Date;
  sky: SkyState;
  /** Null outside the weather forecast. */
  weather: SkyWeather | null;
}

export interface NightPlan {
  bounds: NightBounds;
  samples: NightSample[];
  /** Null when no stretch of the night is good enough. */
  best: SkyWindow | null;
  /** The night's score, 0-100: the best window's mean, or the best moment when there is no window. */
  score: number;
  /** True when every sample had weather; false means clouds are unknown for part of the night. */
  hasWeather: boolean;
}

/** Samples the night that is under way at `now`, or the next one. */
export function planNight(place: Place, weather: readonly SkyWeather[], now: Date): NightPlan {
  const bounds = nightBounds(place, now);
  const start = bounds.sunset ?? now;
  const end = bounds.sunrise ?? new Date(start.getTime() + DAY_MS);

  const samples: NightSample[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += SAMPLE_MINUTES * MINUTE_MS) {
    const time = new Date(t);
    const sky = skyAt(place, time);
    const w = weatherAt(weather, time);
    samples.push({ time, sky, weather: w, ...scoreSky(sky, w) });
  }

  const best = findBestWindow(samples);
  const score = best ? best.score : samples.reduce((m, s) => Math.max(m, s.score), 0);
  return { bounds, samples, best, score, hasWeather: samples.every((s) => s.weather !== null) };
}

/** The next `count` nights starting with tonight, for "next good nights". */
export function planNights(place: Place, weather: readonly SkyWeather[], now: Date, count: number): NightPlan[] {
  const plans: NightPlan[] = [];
  let from = now;
  for (let i = 0; i < count; i++) {
    const plan = planNight(place, weather, from);
    plans.push(plan);
    const after = plan.bounds.sunrise ?? new Date(from.getTime() + DAY_MS);
    from = new Date(after.getTime() + NEXT_NIGHT_GAP_MS);
  }
  return plans;
}
