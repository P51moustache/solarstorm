import { dayjs } from '../util/time';
import { fetchJson } from './fetchJson';
import { getNextCmeArrival, parseCmeDataFromProxy, type CmeCountdownData } from './parsers/cme';

const CACHE_KEY = 'cme:countdown';
const CACHE_TTL = 30; // 30 minutes

const isClient = typeof window !== 'undefined';

export async function getCmeCountdown(): Promise<CmeCountdownData> {
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
    // Use server-side proxy to hide NASA API key
    const raw = await fetchJson('/api/cme');
    const cmes = parseCmeDataFromProxy(raw);
    const countdown = getNextCmeArrival(cmes);

    if (isClient) {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: countdown, timestamp: new Date().toISOString() })
      );
    }

    return countdown;
  } catch (error) {
    console.error('Failed to fetch CME data:', error);
    return { nextArrival: null, recentCmes: [], hoursUntilArrival: null };
  }
}
