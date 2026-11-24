/**
 * When something is up during the night: the stretch of samples where it stands high enough,
 * and the moment it stands highest. Shared by the sources that follow a point on the sky.
 */
import type { NightSample } from '../night';

export interface Position {
  altitude: number;
  azimuth: number;
}

export interface UpSpan {
  start: Date;
  end: Date;
  peak: Position & { time: Date };
}

/** Above this altitude (degrees) something clears trees and haze near the horizon. */
export const MIN_VIEW_ALTITUDE = 10;

/**
 * The span of `samples` (those `usable` lets through) where `position` is at least `minAltitude` up,
 * from the first such sample to the last. Null when it never is.
 */
export function upSpan(
  samples: readonly NightSample[],
  position: (time: Date) => Position,
  usable: (s: NightSample) => boolean,
  minAltitude = MIN_VIEW_ALTITUDE
): UpSpan | null {
  let span: UpSpan | null = null;
  for (const s of samples) {
    if (!usable(s)) continue;
    const p = position(s.time);
    if (p.altitude < minAltitude) continue;
    if (!span) span = { start: s.time, end: s.time, peak: { ...p, time: s.time } };
    span.end = s.time;
    if (p.altitude > span.peak.altitude) span.peak = { ...p, time: s.time };
  }
  return span;
}

/** Words for how high something gets at best. */
export function heightWord(altitude: number): 'Low' | 'Up' | 'High' {
  if (altitude < 25) return 'Low';
  if (altitude < 50) return 'Up';
  return 'High';
}

/**
 * Where to look and when: "Highest in the S at 22:20", or "Climbing in the SE" when it is still rising
 * as the night ends, "Sinking in the SW" when it is already past its best as the night begins.
 */
export function whereAndWhen(span: UpSpan, clock: (d: Date) => string, compass: (az: number) => string): string {
  const dir = compass(span.peak.azimuth);
  const t = span.peak.time.getTime();
  if (t === span.end.getTime() && t !== span.start.getTime()) return `Climbing in the ${dir}`;
  if (t === span.start.getTime() && t !== span.end.getTime()) return `Sinking in the ${dir}`;
  return `Highest in the ${dir} at ${clock(span.peak.time)}`;
}
