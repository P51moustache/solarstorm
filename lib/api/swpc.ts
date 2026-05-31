import { dayjs } from '../util/time';
import { fetchJson } from './fetchJson';
import { parseAlertsData, type SwpcAlert } from './parsers/alerts';
import { parseKpData, parseKpHistory } from './parsers/kp';
import { parseKpForecast, type KpForecastData } from './parsers/kpForecast';
import { parseMagData } from './parsers/mag';
import { generateTestOvationData, parseOvationData, type OvationPayload } from './parsers/ovation';
import { parsePlasmaData } from './parsers/plasma';

// SWPC API endpoints
const ENDPOINTS = {
  KP_1MIN: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
  AURORA_LATEST: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
  MAG_2HOUR: 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json',
  PLASMA_2HOUR: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json',
  ALERTS: 'https://services.swpc.noaa.gov/products/alerts.json',
  KP_FORECAST_3DAY: 'https://services.swpc.noaa.gov/text/3-day-geomag-forecast.txt',
};

// Cache keys and TTLs (in minutes)
const CACHE = {
  KP: { key: 'kp:latest', ttl: 5 },
  SW: { key: 'sw:recent', ttl: 5 },
  OVATION: { key: 'ovation:latest', ttl: 10 },
  ALERTS: { key: 'alerts:latest', ttl: 15 },
  KP_FORECAST: { key: 'kp:forecast', ttl: 60 }, // Updated every few hours
};

interface CachedData<T> {
  data: T;
  timestamp: string;
}

const isClient = typeof window !== 'undefined';
const isDev = process.env.NODE_ENV === 'development';

// Generic cache helpers using localStorage
function getCachedData<T>(cacheKey: string, ttlMinutes: number): T | null {
  if (!isClient) return null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp }: CachedData<T> = JSON.parse(cached);
    const age = dayjs().diff(dayjs(timestamp), 'minute');

    if (age <= ttlMinutes) {
      return data;
    }

    // Cache expired
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error(`Failed to get cached data for ${cacheKey}:`, error);
    return null;
  }
}

function setCachedData<T>(cacheKey: string, data: T): void {
  if (!isClient) return;

  try {
    const cached: CachedData<T> = {
      data,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    console.error(`Failed to cache data for ${cacheKey}:`, error);
  }
}

// API functions
export async function getKpNow(): Promise<{ kp: number; at: string }> {
  if (isDev) console.log('[SWPC] Fetching Kp data...');

  // Try cache first
  const cached = getCachedData<{ kp: number; at: string }>(
    CACHE.KP.key,
    CACHE.KP.ttl
  );
  if (cached) {
    if (isDev) console.log('[SWPC] Using cached Kp data:', cached);
    return cached;
  }

  // Fetch fresh data
  if (isDev) console.log('[SWPC] Fetching fresh Kp data from:', ENDPOINTS.KP_1MIN);
  const data = await fetchJson(ENDPOINTS.KP_1MIN);
  if (isDev) console.log('[SWPC] Raw Kp data received, length:', Array.isArray(data) ? data.length : 'not array');

  const parsed = parseKpData(data);
  if (isDev) console.log('[SWPC] Parsed Kp data:', parsed);

  if (!parsed) {
    throw new Error('Failed to parse Kp data');
  }

  // Cache the result
  setCachedData(CACHE.KP.key, parsed);
  return parsed;
}

export async function getKpHistory(): Promise<Array<{ kp: number; at: string }>> {
  try {
    const data = await fetchJson(ENDPOINTS.KP_1MIN);
    return parseKpHistory(data);
  } catch (error) {
    console.error('Failed to fetch Kp history:', error);
    return [];
  }
}

export async function getSolarWindRecent(): Promise<{
  points: Array<{ at: string; bz: number | null; bt: number | null; speed: number | null; density: number | null }>;
}> {
  if (isDev) console.log('[SWPC] Fetching Solar Wind data...');

  // Try cache first
  const cached = getCachedData<{
    points: Array<{ at: string; bz: number | null; bt: number | null; speed: number | null; density: number | null }>;
  }>(CACHE.SW.key, CACHE.SW.ttl);
  if (cached) {
    if (isDev) console.log('[SWPC] Using cached SW data, points:', cached.points.length);
    return cached;
  }

  // Fetch both mag and plasma data
  if (isDev) console.log('[SWPC] Fetching fresh SW data from mag and plasma endpoints...');
  const [magData, plasmaData] = await Promise.all([
    fetchJson(ENDPOINTS.MAG_2HOUR).catch(() => []),
    fetchJson(ENDPOINTS.PLASMA_2HOUR).catch(() => []),
  ]);

  if (isDev) console.log('[SWPC] Raw mag data length:', Array.isArray(magData) ? magData.length : 'not array');
  if (isDev) console.log('[SWPC] Raw plasma data length:', Array.isArray(plasmaData) ? plasmaData.length : 'not array');

  const magPoints = parseMagData(magData);
  const plasmaPoints = parsePlasmaData(plasmaData);

  // Merge data by timestamp
  const pointsMap = new Map<string, {
    at: string;
    bz: number | null;
    bt: number | null;
    speed: number | null;
    density: number | null;
  }>();

  // Add mag data
  for (const point of magPoints) {
    pointsMap.set(point.time_tag, {
      at: point.time_tag,
      bz: point.bz,
      bt: point.bt ?? null,
      speed: null,
      density: null,
    });
  }

  // Merge plasma data
  for (const point of plasmaPoints) {
    const existing = pointsMap.get(point.time_tag);
    if (existing) {
      existing.speed = point.speed;
      existing.density = point.density;
    } else {
      pointsMap.set(point.time_tag, {
        at: point.time_tag,
        bz: null,
        bt: null,
        speed: point.speed,
        density: point.density,
      });
    }
  }

  // Convert to sorted array
  const points = Array.from(pointsMap.values()).sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  const result = { points };

  // Cache the result
  setCachedData(CACHE.SW.key, result);
  return result;
}

export async function getOvation(): Promise<OvationPayload> {
  if (isDev) console.log('[SWPC] Fetching OVATION data...');

  // Try cache first
  const cached = getCachedData<OvationPayload>(
    CACHE.OVATION.key,
    CACHE.OVATION.ttl
  );
  if (cached) {
    if (isDev) console.log('[SWPC] Using cached OVATION data, cells:', cached.cells.length);
    return cached;
  }

  try {
    // Fetch fresh data
    const data = await fetchJson(ENDPOINTS.AURORA_LATEST);
    const parsed = parseOvationData(data);

    if (!parsed) {
      throw new Error('Failed to parse OVATION data');
    }

    if (isDev) console.log('[SWPC] Fetched fresh OVATION data, cells:', parsed.cells.length);

    // Cache the result
    setCachedData(CACHE.OVATION.key, parsed);
    return parsed;
  } catch (error) {
    if (isDev) console.error('Failed to fetch OVATION data, using test data:', error);

    // Fallback to test data
    const testData = generateTestOvationData();
    if (isDev) console.log('[SWPC] Using test OVATION data, cells:', testData.cells.length);
    setCachedData(CACHE.OVATION.key, testData);
    return testData;
  }
}

export async function getAlerts(): Promise<SwpcAlert[]> {
  if (isDev) console.log('[SWPC] Fetching Alerts data...');

  // Try cache first
  const cached = getCachedData<SwpcAlert[]>(
    CACHE.ALERTS.key,
    CACHE.ALERTS.ttl
  );
  if (cached) {
    if (isDev) console.log('[SWPC] Using cached alerts data, count:', cached.length);
    return cached;
  }

  try {
    // Fetch fresh data
    if (isDev) console.log('[SWPC] Fetching fresh alerts from:', ENDPOINTS.ALERTS);
    const data = await fetchJson(ENDPOINTS.ALERTS);
    if (isDev) console.log('[SWPC] Raw alerts data length:', Array.isArray(data) ? data.length : 'not array');

    const parsed = parseAlertsData(data);
    if (isDev) console.log('[SWPC] Parsed alerts count:', parsed.length);
    if (isDev) console.log('[SWPC] First few alerts:', parsed.slice(0, 2));

    // Cache the result
    setCachedData(CACHE.ALERTS.key, parsed);
    return parsed;
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return [];
  }
}

export async function getKpForecast(): Promise<KpForecastData | null> {
  if (isDev) console.log('[SWPC] Fetching Kp forecast...');

  // Try cache first
  const cached = getCachedData<KpForecastData>(
    CACHE.KP_FORECAST.key,
    CACHE.KP_FORECAST.ttl
  );
  if (cached) {
    if (isDev) console.log('[SWPC] Using cached Kp forecast data');
    return cached;
  }

  try {
    // Fetch as text (not JSON)
    if (isDev) console.log('[SWPC] Fetching fresh Kp forecast from:', ENDPOINTS.KP_FORECAST_3DAY);
    const response = await fetch(ENDPOINTS.KP_FORECAST_3DAY);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    if (isDev) console.log('[SWPC] Raw forecast text length:', text.length);

    const parsed = parseKpForecast(text);
    if (!parsed) {
      throw new Error('Failed to parse Kp forecast data');
    }

    if (isDev) console.log('[SWPC] Parsed Kp forecast, points:', parsed.hourlyForecast.length);

    // Cache the result
    setCachedData(CACHE.KP_FORECAST.key, parsed);
    return parsed;
  } catch (error) {
    console.error('Failed to fetch Kp forecast:', error);
    return null;
  }
}

// Re-export types for convenience
export type { KpForecastData };

// Clear all caches
export function clearCache(): void {
  if (!isClient) return;

  try {
    localStorage.removeItem(CACHE.KP.key);
    localStorage.removeItem(CACHE.SW.key);
    localStorage.removeItem(CACHE.OVATION.key);
    localStorage.removeItem(CACHE.ALERTS.key);
    localStorage.removeItem(CACHE.KP_FORECAST.key);
    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
