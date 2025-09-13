import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayjs } from '../util/time';
import { fetchJson } from './fetchJson';
import { parseAlertsData, type SwpcAlert } from './parsers/alerts';
import { parseKpData, parseKpHistory } from './parsers/kp';
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
};

// Cache keys and TTLs (in minutes)
const CACHE = {
  KP: { key: 'kp:latest', ttl: 5 },
  SW: { key: 'sw:recent', ttl: 5 },
  OVATION: { key: 'ovation:latest', ttl: 10 },
  ALERTS: { key: 'alerts:latest', ttl: 15 },
};

interface CachedData<T> {
  data: T;
  timestamp: string;
}

// Generic cache helpers
async function getCachedData<T>(cacheKey: string, ttlMinutes: number): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp }: CachedData<T> = JSON.parse(cached);
    const age = dayjs().diff(dayjs(timestamp), 'minute');

    if (age <= ttlMinutes) {
      return data;
    }

    // Cache expired
    await AsyncStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error(`Failed to get cached data for ${cacheKey}:`, error);
    return null;
  }
}

async function setCachedData<T>(cacheKey: string, data: T): Promise<void> {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    console.error(`Failed to cache data for ${cacheKey}:`, error);
  }
}

// API functions
export async function getKpNow(): Promise<{ kp: number; at: string }> {
  if (__DEV__) console.log('[SWPC] Fetching Kp data...');
  
  // Try cache first
  const cached = await getCachedData<{ kp: number; at: string }>(
    CACHE.KP.key,
    CACHE.KP.ttl
  );
  if (cached) {
    if (__DEV__) console.log('[SWPC] Using cached Kp data:', cached);
    return cached;
  }

  // Fetch fresh data
  if (__DEV__) console.log('[SWPC] Fetching fresh Kp data from:', ENDPOINTS.KP_1MIN);
  const data = await fetchJson(ENDPOINTS.KP_1MIN);
  if (__DEV__) console.log('[SWPC] Raw Kp data received, length:', Array.isArray(data) ? data.length : 'not array');
  
  const parsed = parseKpData(data);
  if (__DEV__) console.log('[SWPC] Parsed Kp data:', parsed);

  if (!parsed) {
    throw new Error('Failed to parse Kp data');
  }

  // Cache the result
  await setCachedData(CACHE.KP.key, parsed);
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
  points: Array<{ at: string; bz: number | null; speed: number | null; density: number | null }>;
}> {
  if (__DEV__) console.log('[SWPC] Fetching Solar Wind data...');
  
  // Try cache first
  const cached = await getCachedData<{
    points: Array<{ at: string; bz: number | null; speed: number | null; density: number | null }>;
  }>(CACHE.SW.key, CACHE.SW.ttl);
  if (cached) {
    if (__DEV__) console.log('[SWPC] Using cached SW data, points:', cached.points.length);
    return cached;
  }

  // Fetch both mag and plasma data
  if (__DEV__) console.log('[SWPC] Fetching fresh SW data from mag and plasma endpoints...');
  const [magData, plasmaData] = await Promise.all([
    fetchJson(ENDPOINTS.MAG_2HOUR).catch(() => []),
    fetchJson(ENDPOINTS.PLASMA_2HOUR).catch(() => []),
  ]);
  
  if (__DEV__) console.log('[SWPC] Raw mag data length:', Array.isArray(magData) ? magData.length : 'not array');
  if (__DEV__) console.log('[SWPC] Raw plasma data length:', Array.isArray(plasmaData) ? plasmaData.length : 'not array');

  const magPoints = parseMagData(magData);
  const plasmaPoints = parsePlasmaData(plasmaData);

  // Merge data by timestamp
  const pointsMap = new Map<string, {
    at: string;
    bz: number | null;
    speed: number | null;
    density: number | null;
  }>();

  // Add mag data
  for (const point of magPoints) {
    pointsMap.set(point.time_tag, {
      at: point.time_tag,
      bz: point.bz,
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
  await setCachedData(CACHE.SW.key, result);
  return result;
}

export async function getOvation(): Promise<OvationPayload> {
  if (__DEV__) console.log('[SWPC] Fetching OVATION data...');
  
  // Try cache first
  const cached = await getCachedData<OvationPayload>(
    CACHE.OVATION.key,
    CACHE.OVATION.ttl
  );
  if (cached) {
    if (__DEV__) console.log('[SWPC] Using cached OVATION data, cells:', cached.cells.length);
    return cached;
  }

  try {
    // Fetch fresh data
    const data = await fetchJson(ENDPOINTS.AURORA_LATEST);
    const parsed = parseOvationData(data);

    if (!parsed) {
      throw new Error('Failed to parse OVATION data');
    }

    if (__DEV__) console.log('[SWPC] Fetched fresh OVATION data, cells:', parsed.cells.length);

    // Cache the result
    await setCachedData(CACHE.OVATION.key, parsed);
    return parsed;
  } catch (error) {
    if (__DEV__) console.error('Failed to fetch OVATION data, using test data:', error);
    
    // Fallback to test data
    const testData = generateTestOvationData();
    if (__DEV__) console.log('[SWPC] Using test OVATION data, cells:', testData.cells.length);
    await setCachedData(CACHE.OVATION.key, testData);
    return testData;
  }
}

export async function getAlerts(): Promise<SwpcAlert[]> {
  if (__DEV__) console.log('[SWPC] Fetching Alerts data...');
  
  // Try cache first
  const cached = await getCachedData<SwpcAlert[]>(
    CACHE.ALERTS.key,
    CACHE.ALERTS.ttl
  );
  if (cached) {
    if (__DEV__) console.log('[SWPC] Using cached alerts data, count:', cached.length);
    return cached;
  }

  try {
    // Fetch fresh data
    if (__DEV__) console.log('[SWPC] Fetching fresh alerts from:', ENDPOINTS.ALERTS);
    const data = await fetchJson(ENDPOINTS.ALERTS);
    if (__DEV__) console.log('[SWPC] Raw alerts data length:', Array.isArray(data) ? data.length : 'not array');
    
    const parsed = parseAlertsData(data);
    if (__DEV__) console.log('[SWPC] Parsed alerts count:', parsed.length);
    if (__DEV__) console.log('[SWPC] First few alerts:', parsed.slice(0, 2));

    // Cache the result
    await setCachedData(CACHE.ALERTS.key, parsed);
    return parsed;
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return [];
  }
}

// Clear all caches
export async function clearCache(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(CACHE.KP.key),
      AsyncStorage.removeItem(CACHE.SW.key),
      AsyncStorage.removeItem(CACHE.OVATION.key),
      AsyncStorage.removeItem(CACHE.ALERTS.key),
    ]);
    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
