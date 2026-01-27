import { dayjs } from '../util/time';
import { fetchJson } from './fetchJson';
import {
  combineHistoricalData,
  parseHistoricalKp,
  parseHistoricalMag,
  parseHistoricalPlasma,
  type HistoricalSummary,
} from './parsers/historical';

const CACHE_KEY = 'historical:90day';
const CACHE_TTL = 360; // 6 hours

const isClient = typeof window !== 'undefined';

export async function getHistoricalData(): Promise<HistoricalSummary | null> {
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

  try {
    // Fetch data in parallel
    const [kpRaw, plasmaRaw, magRaw] = await Promise.all([
      fetchJson('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'),
      fetchJson('https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json'),
      fetchJson('https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json'),
    ]);

    // Parse each data source
    const kpData = parseHistoricalKp(kpRaw);
    const plasmaData = parseHistoricalPlasma(plasmaRaw);
    const magData = parseHistoricalMag(magRaw);

    // Combine into unified historical data
    // Note: NOAA only provides ~30 days of Kp and ~7 days of plasma/mag
    // We'll show what's available
    const historical = combineHistoricalData(kpData, plasmaData, magData, 30);

    // Cache the result
    if (isClient) {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: historical, timestamp: new Date().toISOString() })
      );
    }

    return historical;
  } catch (error) {
    console.error('Failed to fetch historical data:', error);
    return null;
  }
}
