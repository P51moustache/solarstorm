/**
 * NOAA real-time solar wind (RTSW) feeds and their parsers.
 *
 * The one-minute files below replaced `products/solar-wind/*.json`, which NOAA removed in
 * 2026 (Service Change Notice 26-21). What differs from the old files:
 *  - rows are objects, newest first, covering about the last 24 hours;
 *  - one file mixes several spacecraft, and only rows flagged `active` come from the
 *    spacecraft NOAA's forecasters were using at that minute;
 *  - the 3-day and 7-day windows are no longer published.
 *
 * Pure functions only: fetching stays in spaceWeather.ts.
 */

export const RTSW_FEEDS = {
  MAG: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json',
  WIND: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json',
} as const;

/**
 * One-row "latest value" files, read only when the one-minute files give no reading.
 * Their values are rounded to whole numbers and they carry no density.
 */
export const SUMMARY_FEEDS = {
  MAG: 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json',
  SPEED: 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json',
} as const;

export interface SolarWind {
  speed: number | null; // km/s
  density: number | null; // p/cm^3
  bz: number | null; // nT
  bt: number | null; // nT
  at: string | null;
}

export interface SolarWindPoint {
  at: string;
  bz: number | null;
  speed: number | null;
}

/**
 * Most points a chart series keeps: about one per 10 minutes across the 24 hours NOAA
 * publishes, which is as fine as an 84pt-high line chart can show.
 */
export const SERIES_MAX_POINTS = 150;

type Row = Record<string, unknown>;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === 'null') return null;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

function timeTag(row: Row | null): string | null {
  return row && typeof row.time_tag === 'string' ? row.time_tag : null;
}

/** Rows from the spacecraft NOAA was treating as operational, each with a timestamp. */
function activeRows(data: unknown): Row[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (r): r is Row => !!r && typeof r === 'object' && r.active === true && typeof r.time_tag === 'string'
  );
}

/** Newest row holding a reading for any of `fields`. ISO time tags order correctly as text. */
function newestWith(rows: Row[], fields: string[]): Row | null {
  let best: Row | null = null;
  for (const row of rows) {
    if (!fields.some((f) => num(row[f]) !== null)) continue;
    if (!best || (row.time_tag as string) > (best.time_tag as string)) best = row;
  }
  return best;
}

/** Latest solar-wind reading from the one-minute magnetometer and plasma files. */
export function latestSolarWind(magData: unknown, windData: unknown): SolarWind {
  const mag = newestWith(activeRows(magData), ['bz_gsm']);
  const wind = newestWith(activeRows(windData), ['proton_speed', 'proton_density']);
  return {
    speed: num(wind?.proton_speed),
    density: num(wind?.proton_density),
    bz: num(mag?.bz_gsm),
    bt: num(mag?.bt),
    at: timeTag(wind) ?? timeTag(mag),
  };
}

/** The summary files hold one object; older versions of them were not wrapped in an array. */
function onlyRow(data: unknown): Row | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === 'object' ? (row as Row) : null;
}

/** Latest Bz, Bt and speed from the summary files. Density is not published there. */
export function summarySolarWind(magData: unknown, speedData: unknown): SolarWind {
  const mag = onlyRow(magData);
  const speed = onlyRow(speedData);
  return {
    speed: num(speed?.proton_speed),
    density: null,
    bz: num(mag?.bz_gsm),
    bt: num(mag?.bt),
    at: timeTag(speed) ?? timeTag(mag),
  };
}

/** True when a reading lacks a value the alerts and the aurora estimate depend on. */
export function isIncomplete(wind: SolarWind): boolean {
  return wind.bz === null || wind.speed === null;
}

/** `primary`, with each missing value taken from `fallback`. */
export function fillMissing(primary: SolarWind, fallback: SolarWind): SolarWind {
  return {
    speed: primary.speed ?? fallback.speed,
    density: primary.density ?? fallback.density,
    bz: primary.bz ?? fallback.bz,
    bt: primary.bt ?? fallback.bt,
    at: primary.at ?? fallback.at,
  };
}

/** A time tag cut to its minute. Spacecraft stamp the same minute with different seconds. */
function minuteOf(tag: string): string {
  return `${tag.slice(0, 16)}:00`;
}

/**
 * Bz and speed over the published window, merged by minute, oldest first, thinned for
 * charts. Thinning counts back from the newest point so the latest reading is always kept.
 */
export function solarWindSeries(
  magData: unknown,
  windData: unknown,
  maxPoints = SERIES_MAX_POINTS
): SolarWindPoint[] {
  const merged = new Map<string, SolarWindPoint>();
  const pointAt = (at: string): SolarWindPoint => {
    let point = merged.get(at);
    if (!point) {
      point = { at, bz: null, speed: null };
      merged.set(at, point);
    }
    return point;
  };

  for (const row of activeRows(magData)) pointAt(minuteOf(row.time_tag as string)).bz = num(row.bz_gsm);
  for (const row of activeRows(windData)) {
    pointAt(minuteOf(row.time_tag as string)).speed = num(row.proton_speed);
  }

  const sorted = Array.from(merged.values()).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  if (sorted.length <= maxPoints) return sorted;
  const step = Math.ceil(sorted.length / maxPoints);
  const newest = sorted.length - 1;
  return sorted.filter((_, i) => (newest - i) % step === 0);
}
