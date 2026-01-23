import { fetchJson } from './fetchJson';
import {
  parseTecData,
  calculateTecMapStats,
  calculateRegionalTec,
  getTecCondition,
  type TecMapData,
  type RegionalTec,
  type TecCondition,
} from './parsers/tec';

// SWPC TEC data endpoint (US coverage)
const TEC_URL = 'https://services.swpc.noaa.gov/json/us_tec.json';

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes (matches update frequency)
let tecCache: { data: TecMapData; timestamp: number } | null = null;

export async function getTecMap(): Promise<TecMapData> {
  const now = Date.now();
  if (tecCache && now - tecCache.timestamp < CACHE_TTL) {
    return tecCache.data;
  }

  try {
    const data = await fetchJson(TEC_URL);
    const readings = parseTecData(data);
    const mapData = calculateTecMapStats(readings);
    tecCache = { data: mapData, timestamp: now };
    return mapData;
  } catch (error) {
    console.error('Failed to fetch TEC data:', error);
    if (tecCache) return tecCache.data;
    throw error;
  }
}

export async function getRegionalTec(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  regionLabel: string
): Promise<RegionalTec> {
  const mapData = await getTecMap();
  return calculateRegionalTec(mapData.readings, centerLat, centerLng, radiusKm, regionLabel);
}

export interface TecStatus {
  global: {
    mean: number;
    max: number;
    condition: TecCondition;
  };
  regions: RegionalTec[];
  updatedAt: string;
}

export async function getTecStatus(
  regions: Array<{ lat: number; lng: number; radiusKm: number; label: string }>
): Promise<TecStatus> {
  const mapData = await getTecMap();

  const regionalData = regions.map((r) =>
    calculateRegionalTec(mapData.readings, r.lat, r.lng, r.radiusKm, r.label)
  );

  return {
    global: {
      mean: mapData.globalMean,
      max: mapData.globalMax,
      condition: getTecCondition(mapData.globalMean),
    },
    regions: regionalData,
    updatedAt: mapData.timestamp,
  };
}
