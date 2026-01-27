import { dayjs } from '../util/time';
import { fetchJson } from './fetchJson';
import { calculateSfiTrend, parseSolarFluxData, type SfiTrend } from './parsers/solarFlux';

const CACHE_KEY = 'sfi:trend';
const CACHE_TTL = 60; // 1 hour

const isClient = typeof window !== 'undefined';

export async function getSfiTrend(): Promise<SfiTrend | null> {
  // Check cache
  if (isClient) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = dayjs().diff(dayjs(timestamp), 'minute');
        if (age <= CACHE_TTL) return data;
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }
  }

  // Fetch fresh data
  try {
    const raw = await fetchJson('https://services.swpc.noaa.gov/json/f107_cm_flux.json');
    const parsed = parseSolarFluxData(raw);
    const trend = calculateSfiTrend(parsed);

    if (trend && isClient) {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: trend, timestamp: new Date().toISOString() })
      );
    }

    return trend;
  } catch (error) {
    console.error('Failed to fetch SFI data:', error);
    return null;
  }
}
