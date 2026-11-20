/**
 * SolarStorm space-weather data layer (mobile).
 *
 * By default this fetches directly from NOAA SWPC's public, CORS-enabled feeds
 * so the app shows live data on a fresh `npx expo start` with no backend running.
 *
 * For production (architecture A), set EXPO_PUBLIC_API_BASE_URL to your deployed
 * Next.js backend and the app will consume `/api/v1/current` instead — keeping
 * API keys server-side. See getCurrentConditions().
 */

import { headlineKp } from '@/lib/kpEstimate';
import {
  fillMissing,
  isIncomplete,
  latestSolarWind,
  RTSW_FEEDS,
  solarWindSeries,
  SUMMARY_FEEDS,
  summarySolarWind,
  type SolarWind,
  type SolarWindPoint,
} from '@/lib/solarWindFeed';

export type { SolarWind, SolarWindPoint };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? null;

const NOAA = {
  KP_1MIN: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
  KP_PLANETARY: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  FORECAST_3DAY: 'https://services.swpc.noaa.gov/text/3-day-geomag-forecast.txt',
  OUTLOOK_27DAY: 'https://services.swpc.noaa.gov/text/27-day-outlook.txt',
  SCALES: 'https://services.swpc.noaa.gov/products/noaa-scales.json',
  XRAY_FLARE: 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json',
  ALERTS: 'https://services.swpc.noaa.gov/products/alerts.json',
};

/** Chart window on the Trends screen. */
export type Range = '1d' | '3d' | '7d';

export interface CurrentConditions {
  kp: number | null;
  kpAt: string | null;
  solarWind: SolarWind;
  fetchedAt: string;
}

export interface KpReading {
  kp: number;
  at: string;
}

async function fetchJson<T = unknown>(url: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Public API ----

export async function getCurrentConditions(): Promise<CurrentConditions> {
  const fetchedAt = new Date().toISOString();

  if (API_BASE_URL) {
    // Production path: go through the Next.js backend.
    const data = await fetchJson<any>(`${API_BASE_URL}/api/v1/current`);
    return {
      kp: data?.geomagnetic?.kp ?? null,
      kpAt: data?.geomagnetic?.kp_timestamp ?? null,
      solarWind: {
        speed: data?.solar_wind?.speed_km_s ?? null,
        density: data?.solar_wind?.density_p_cm3 ?? null,
        bz: data?.solar_wind?.bz_nT ?? null,
        bt: data?.solar_wind?.bt_nT ?? null,
        at: data?.solar_wind?.timestamp ?? null,
      },
      fetchedAt,
    };
  }

  // No backend configured (the shipped app): read NOAA directly.
  const [kpData, magData, windData] = await Promise.all([
    fetchJson(NOAA.KP_1MIN).catch(() => null),
    fetchJson(RTSW_FEEDS.MAG).catch(() => null),
    fetchJson(RTSW_FEEDS.WIND).catch(() => null),
  ]);

  const kp = headlineKp(kpData);

  return {
    kp: kp?.kp ?? null,
    kpAt: kp?.at ?? null,
    solarWind: await withSummaryFallback(latestSolarWind(magData, windData)),
    fetchedAt,
  };
}

/** Fill a reading the one-minute files left incomplete from NOAA's small summary files. */
async function withSummaryFallback(wind: SolarWind): Promise<SolarWind> {
  if (!isIncomplete(wind)) return wind;
  const [magData, speedData] = await Promise.all([
    fetchJson(SUMMARY_FEEDS.MAG).catch(() => null),
    fetchJson(SUMMARY_FEEDS.SPEED).catch(() => null),
  ]);
  return fillMissing(wind, summarySolarWind(magData, speedData));
}

// ---- 3-day geomagnetic forecast (NOAA text product) ----

export interface ForecastDay {
  label: string; // e.g. "May 31"
  maxKp: number;
  minorPct: number; // G1+ storm probability (%)
  moderatePct: number; // G2+ (%)
  strongPct: number; // G3+ (%)
}

export interface Forecast {
  issuedAt: string | null;
  days: ForecastDay[];
  series: KpReading[]; // 3-hourly predicted Kp for the next ~3 days
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function forecastISO(dayLabel: string, hour: number): string | null {
  const [mon, day] = dayLabel.split(/\s+/);
  const m = MONTHS[mon];
  if (m === undefined) return null;
  const now = new Date();
  let year = now.getUTCFullYear();
  // Handle a Dec→Jan year rollover in the forecast window.
  if (now.getUTCMonth() >= 10 && m <= 1) year += 1;
  return new Date(Date.UTC(year, m, parseInt(day, 10), hour, 0, 0)).toISOString();
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';

export async function getForecast(): Promise<Forecast | null> {
  const text = await fetchText(NOAA.FORECAST_3DAY).catch(() => null);
  if (!text) return null;

  const lines = text.split('\n');

  // Issued date, e.g. ":Issued: 2026 May 31 1230 UTC"
  const issuedLine = lines.find((l) => l.startsWith(':Issued:'));
  const issuedAt = issuedLine?.replace(':Issued:', '').trim() ?? null;

  // Header row carries the three day labels, e.g. "May 31   Jun 01   Jun 02"
  const headerRe = new RegExp(`${MONTH}\\s+\\d+.*${MONTH}\\s+\\d+.*${MONTH}\\s+\\d+`);
  const headerIdx = lines.findIndex((l) => headerRe.test(l));
  if (headerIdx === -1) return null;

  const dayLabels = (lines[headerIdx].match(new RegExp(`${MONTH}\\s+\\d+`, 'g')) ?? []).slice(0, 3);
  if (dayLabels.length < 3) return null;

  // Max Kp per day column + a 3-hourly predicted series across the UT rows.
  const maxKp = [0, 0, 0];
  const series: KpReading[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(\d{2})-\d{2}UT\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (m) {
      const hour = parseInt(m[1], 10);
      for (let c = 0; c < 3; c++) {
        const kp = parseFloat(m[c + 2]);
        maxKp[c] = Math.max(maxKp[c], kp);
        const at = forecastISO(dayLabels[c], hour);
        if (at) series.push({ kp, at });
      }
    }
  }
  series.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const prob = (re: RegExp) => {
    const line = lines.find((l) => re.test(l));
    const nums = line?.match(re)?.[1]?.split('/').map((v) => parseInt(v, 10)) ?? [0, 0, 0];
    return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0];
  };
  const minor = prob(/^Minor storm\s+([\d/]+)/);
  const moderate = prob(/^Moderate storm\s+([\d/]+)/);
  const strong = prob(/^Strong-Extreme storm\s+([\d/]+)/);

  const days: ForecastDay[] = dayLabels.map((label, i) => ({
    label,
    maxKp: maxKp[i],
    minorPct: minor[i],
    moderatePct: moderate[i],
    strongPct: strong[i],
  }));

  return { issuedAt, days, series };
}

/** Multi-day (≈7d) 3-hourly observed/estimated planetary Kp series. */
export async function getKpSeries(): Promise<KpReading[]> {
  const data = await fetchJson(NOAA.KP_PLANETARY).catch(() => null);
  if (!Array.isArray(data)) return [];
  return (data as any[])
    .map((r) => ({ kp: Number(r.Kp), at: String(r.time_tag) }))
    .filter((r) => Number.isFinite(r.kp) && r.at && r.at !== 'undefined');
}

// ---- Look-ahead: NOAA 27-day outlook ----

export interface OutlookDay {
  label: string; // e.g. "Jun 02"
  kp: number; // largest predicted Kp
  ap: number; // planetary A index
  flux: number; // F10.7 radio flux
}

/**
 * Predicted daily activity from today on (default: the next 14 days).
 * NOAA issues the table weekly, so its first rows fall behind the calendar; days whose
 * UTC date has ended are skipped.
 */
export async function getOutlook(days = 14, now = new Date()): Promise<OutlookDay[]> {
  const text = await fetchText(NOAA.OUTLOOK_27DAY).catch(() => null);
  if (!text) return [];
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: OutlookDay[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d{4})\s+(\w{3})\s+(\d{2})\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (!m) continue;
    // An unreadable month gives NaN, which compares false and keeps the row.
    if (Date.UTC(+m[1], MONTHS[m[2]], +m[3]) < today) continue;
    out.push({ label: `${m[2]} ${m[3]}`, flux: +m[4], ap: +m[5], kp: +m[6] });
  }
  return out.slice(0, days);
}

// ---- Operator-grade activity: NOAA scales, flares, alerts ----

export interface NoaaScale {
  scale: number; // 0-5
  text: string; // e.g. "none", "Moderate"
}
export interface Scales {
  R: NoaaScale; // radio blackouts (flares)
  S: NoaaScale; // solar radiation storm (protons)
  G: NoaaScale; // geomagnetic storm
}

export async function getScales(): Promise<Scales | null> {
  const j = await fetchJson<any>(NOAA.SCALES).catch(() => null);
  const c = j?.['0'];
  if (!c) return null;
  const m = (x: any): NoaaScale => ({ scale: parseInt(x?.Scale ?? '0', 10) || 0, text: x?.Text ?? 'none' });
  return { R: m(c.R), S: m(c.S), G: m(c.G) };
}

export interface Flare {
  currentClass: string;
  maxClass: string;
  maxTime: string | null;
}

export async function getLatestFlare(): Promise<Flare | null> {
  const j = await fetchJson<any>(NOAA.XRAY_FLARE).catch(() => null);
  const o = Array.isArray(j) ? j[0] : j;
  if (!o) return null;
  return {
    currentClass: o.current_class ?? '—',
    maxClass: o.max_class ?? o.current_class ?? '—',
    maxTime: o.max_time ?? null,
  };
}

export interface SpaceAlert {
  title: string;
  issued: string | null;
}

export async function getSpaceAlerts(limit = 8): Promise<SpaceAlert[]> {
  const j = await fetchJson<any[]>(NOAA.ALERTS).catch(() => null);
  if (!Array.isArray(j)) return [];
  const sorted = [...j].sort(
    (a, b) => Date.parse(b.issue_datetime ?? 0) - Date.parse(a.issue_datetime ?? 0)
  );
  return sorted.slice(0, limit).map((a) => {
    const msg: string = a.message ?? '';
    const m = msg.match(/\b(ALERT|WARNING|WATCH|SUMMARY)\b:?\s*([^\r\n]+)/i);
    const title = m
      ? `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}: ${m[2].trim()}`
      : msg.split(/\r?\n/).find((l) => l.trim()) ?? 'Space weather alert';
    return { title: title.slice(0, 130), issued: a.issue_datetime ?? null };
  });
}

export async function getKpHistory(): Promise<KpReading[]> {
  const data = await fetchJson(NOAA.KP_1MIN).catch(() => null);
  if (!Array.isArray(data)) return [];
  const out: KpReading[] = [];
  for (const row of data as any[]) {
    const kp = row?.estimated_kp ?? row?.kp_index;
    if (typeof kp === 'number' && row?.time_tag) out.push({ kp: Number(kp), at: row.time_tag });
  }
  return out;
}

/** Bz and solar-wind speed for the last ~24 hours, the longest window NOAA publishes. */
export async function getSolarWindHistory(): Promise<SolarWindPoint[]> {
  const [magData, windData] = await Promise.all([
    fetchJson(RTSW_FEEDS.MAG).catch(() => null),
    fetchJson(RTSW_FEEDS.WIND).catch(() => null),
  ]);
  return solarWindSeries(magData, windData);
}
