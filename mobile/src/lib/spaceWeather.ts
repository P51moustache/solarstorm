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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? null;

const NOAA = {
  KP_1MIN: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
  KP_PLANETARY: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  MAG_2HOUR: 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json',
  PLASMA_2HOUR: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json',
  FORECAST_3DAY: 'https://services.swpc.noaa.gov/text/3-day-geomag-forecast.txt',
};

export type Range = '1d' | '3d' | '7d';

const SW_PRODUCTS: Record<Range, { mag: string; plasma: string }> = {
  '1d': { mag: 'mag-1-day', plasma: 'plasma-1-day' },
  '3d': { mag: 'mag-3-day', plasma: 'plasma-3-day' },
  '7d': { mag: 'mag-7-day', plasma: 'plasma-7-day' },
};
const SW_BASE = 'https://services.swpc.noaa.gov/products/solar-wind/';

export interface SolarWind {
  speed: number | null; // km/s
  density: number | null; // p/cm^3
  bz: number | null; // nT
  bt: number | null; // nT
  at: string | null;
}

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

// ---- NOAA parsers (mirror the web app's lib/api/parsers) ----

function parseKp(data: unknown): KpReading | null {
  if (!Array.isArray(data)) return null;
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i] as { time_tag?: string; kp_index?: number; estimated_kp?: number };
    const kp = row?.estimated_kp ?? row?.kp_index;
    if (typeof kp === 'number' && row.time_tag) return { kp: Number(kp), at: row.time_tag };
  }
  return null;
}

function columnIndex(headers: string[], ...needles: string[]): number {
  return headers.findIndex((h) => needles.some((n) => h.toLowerCase().includes(n)));
}

function parseLatestMag(data: unknown): { bz: number | null; bt: number | null; at: string | null } {
  if (!Array.isArray(data) || data.length < 2) return { bz: null, bt: null, at: null };
  const headers = data[0] as string[];
  const ti = columnIndex(headers, 'time_tag');
  const bzi = columnIndex(headers, 'bz_gsm', 'bz');
  const bti = columnIndex(headers, 'bt');
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i] as string[];
    const bz = num(row?.[bzi]);
    if (bz !== null) {
      return { bz, bt: num(row?.[bti]), at: row?.[ti] ?? null };
    }
  }
  return { bz: null, bt: null, at: null };
}

function parseLatestPlasma(data: unknown): { speed: number | null; density: number | null; at: string | null } {
  if (!Array.isArray(data) || data.length < 2) return { speed: null, density: null, at: null };
  const headers = data[0] as string[];
  const ti = columnIndex(headers, 'time_tag');
  const si = columnIndex(headers, 'speed');
  const di = columnIndex(headers, 'density');
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i] as string[];
    const speed = num(row?.[si]);
    const density = num(row?.[di]);
    if (speed !== null || density !== null) {
      return { speed, density, at: row?.[ti] ?? null };
    }
  }
  return { speed: null, density: null, at: null };
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === 'null') return null;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
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

  // Dev path: NOAA directly.
  const [kpData, magData, plasmaData] = await Promise.all([
    fetchJson(NOAA.KP_1MIN).catch(() => null),
    fetchJson(NOAA.MAG_2HOUR).catch(() => null),
    fetchJson(NOAA.PLASMA_2HOUR).catch(() => null),
  ]);

  const kp = parseKp(kpData);
  const mag = parseLatestMag(magData);
  const plasma = parseLatestPlasma(plasmaData);

  return {
    kp: kp?.kp ?? null,
    kpAt: kp?.at ?? null,
    solarWind: {
      speed: plasma.speed,
      density: plasma.density,
      bz: mag.bz,
      bt: mag.bt,
      at: plasma.at ?? mag.at,
    },
    fetchedAt,
  };
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

export interface SolarWindPoint {
  at: string;
  bz: number | null;
  speed: number | null;
}

/** Time series of Bz and solar-wind speed over the given range, merged + downsampled. */
export async function getSolarWindHistory(range: Range = '1d'): Promise<SolarWindPoint[]> {
  const product = SW_PRODUCTS[range];
  const [magData, plasmaData] = await Promise.all([
    fetchJson(`${SW_BASE}${product.mag}.json`).catch(() => null),
    fetchJson(`${SW_BASE}${product.plasma}.json`).catch(() => null),
  ]);

  const merged = new Map<string, SolarWindPoint>();

  if (Array.isArray(magData) && magData.length > 1) {
    const headers = magData[0] as string[];
    const ti = columnIndex(headers, 'time_tag');
    const bzi = columnIndex(headers, 'bz_gsm', 'bz');
    for (let i = 1; i < magData.length; i++) {
      const row = magData[i] as string[];
      const at = row?.[ti];
      if (!at) continue;
      merged.set(at, { at, bz: num(row[bzi]), speed: merged.get(at)?.speed ?? null });
    }
  }

  if (Array.isArray(plasmaData) && plasmaData.length > 1) {
    const headers = plasmaData[0] as string[];
    const ti = columnIndex(headers, 'time_tag');
    const si = columnIndex(headers, 'speed');
    for (let i = 1; i < plasmaData.length; i++) {
      const row = plasmaData[i] as string[];
      const at = row?.[ti];
      if (!at) continue;
      const existing = merged.get(at);
      if (existing) existing.speed = num(row[si]);
      else merged.set(at, { at, bz: null, speed: num(row[si]) });
    }
  }

  const sorted = Array.from(merged.values()).sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  // Downsample to keep charts light on the larger windows.
  const MAX = 150;
  if (sorted.length <= MAX) return sorted;
  const step = Math.ceil(sorted.length / MAX);
  return sorted.filter((_, i) => i % step === 0);
}
