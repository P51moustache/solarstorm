/**
 * How times and directions read in the night summary. A `Clock` is passed in so the
 * pure summaries test in any time zone; screens use `localClock`.
 */

/** Formats an instant as a short time of day, e.g. "22:10". */
export type Clock = (date: Date) => string;

const pad = (n: number) => String(n).padStart(2, '0');

/** 24-hour "HH:MM" in the device's time zone. */
export const localClock: Clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** 24-hour "HH:MM" in UTC (tests). */
export const utcClock: Clock = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** Eight-point compass direction for an azimuth in degrees (0 north, 90 east). */
export function compassPoint(azimuth: number): (typeof COMPASS)[number] {
  const a = ((azimuth % 360) + 360) % 360;
  return COMPASS[Math.round(a / 45) % COMPASS.length];
}
