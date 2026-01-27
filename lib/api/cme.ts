import { dayjs } from '../util/time';
import { fetchJson } from './fetchJson';
import { getNextCmeArrival, parseCmeData, type CmeCountdownData } from './parsers/cme';

const NASA_API_KEY = process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY';
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

  // Fetch last 30 days of CME data
  const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const endDate = dayjs().format('YYYY-MM-DD');

  try {
    const url = `https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`;
    const raw = await fetchJson(url);
    const cmes = parseCmeData(raw);
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
