/**
 * The hour-by-hour strip under tonight's headline: one column per whole hour from sunset to sunrise,
 * with cloud cover and darkness, and which hours fall in the best window.
 */
import type { NightPlan, NightSample } from './night';
import type { SkyWeather } from './weather';

export interface HourColumn {
  time: Date;
  /** Share of the sky under cloud, 0-100, all layers together; null outside the forecast. */
  cloud: number | null;
  /** How dark the sky is, 0-100: the score's darkness and moonlight factors together. */
  darkness: number;
  /** The sample's sky score, 0-100. */
  score: number;
  inBest: boolean;
}

const HOUR_MS = 3_600_000;

/** Total cloud cover from the three layers, treating them as independent: 0-100. */
export function totalCloud(w: Pick<SkyWeather, 'cloudLow' | 'cloudMid' | 'cloudHigh'>): number {
  const clear = [w.cloudLow, w.cloudMid, w.cloudHigh].reduce((c, pct) => c * (1 - pct / 100), 1);
  return Math.round(100 * (1 - clear));
}

/** Darkness of one sample, 0-100. */
export function darknessPercent(s: Pick<NightSample, 'factors'>): number {
  return Math.round(100 * s.factors.darkness * s.factors.moon);
}

function nearestSample(samples: readonly NightSample[], t: number): NightSample {
  return samples.reduce((best, s) =>
    Math.abs(s.time.getTime() - t) < Math.abs(best.time.getTime() - t) ? s : best
  );
}

/** Columns for each whole hour inside the night. Empty when the plan has no samples. */
export function hourStrip(plan: NightPlan): HourColumn[] {
  const { samples, best } = plan;
  if (samples.length === 0) return [];
  const first = Math.ceil(samples[0].time.getTime() / HOUR_MS) * HOUR_MS;
  const last = samples[samples.length - 1].time.getTime();
  const columns: HourColumn[] = [];
  for (let t = first; t <= last; t += HOUR_MS) {
    const s = nearestSample(samples, t);
    columns.push({
      time: new Date(t),
      cloud: s.weather ? totalCloud(s.weather) : null,
      darkness: darknessPercent(s),
      score: s.score,
      inBest: best !== null && t >= best.start.getTime() && t < best.end.getTime(),
    });
  }
  return columns;
}
