import { fetchJson } from '../api/fetchJson';

const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

export interface WeatherData {
  cloudCover: number; // 0-100%
  visibility: number; // meters
  sunset: Date;
  sunrise: Date;
  moonPhase: number; // 0-1 (0 = new moon, 0.5 = full moon)
}

export async function getWeatherData(lat: number, lng: number): Promise<WeatherData | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeather API key not configured');
    // Return mock data for development
    const now = new Date();
    const sunset = new Date(now);
    sunset.setHours(18, 30, 0, 0);
    const sunrise = new Date(now);
    sunrise.setDate(sunrise.getDate() + 1);
    sunrise.setHours(6, 30, 0, 0);

    return {
      cloudCover: 20,
      visibility: 10000,
      sunset,
      sunrise,
      moonPhase: 0.25,
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&exclude=minutely,hourly,alerts&appid=${OPENWEATHER_API_KEY}`;
    const data = await fetchJson(url) as {
      current?: { clouds?: number; visibility?: number; sunset?: number; sunrise?: number };
      daily?: Array<{ moon_phase?: number }>;
    };

    return {
      cloudCover: data.current?.clouds ?? 0,
      visibility: data.current?.visibility ?? 10000,
      sunset: new Date((data.current?.sunset ?? 0) * 1000),
      sunrise: new Date((data.current?.sunrise ?? 0) * 1000),
      moonPhase: data.daily?.[0]?.moon_phase ?? 0,
    };
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    return null;
  }
}

export function getPhotoConditions(
  weather: WeatherData,
  auroraProbability: number
): {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  factors: Array<{ label: string; status: 'good' | 'fair' | 'poor'; note: string }>;
} {
  const factors: Array<{ label: string; status: 'good' | 'fair' | 'poor'; note: string }> = [];

  // Cloud cover
  if (weather.cloudCover < 20) {
    factors.push({ label: 'Sky', status: 'good', note: 'Clear skies' });
  } else if (weather.cloudCover < 50) {
    factors.push({ label: 'Sky', status: 'fair', note: 'Partly cloudy' });
  } else {
    factors.push({ label: 'Sky', status: 'poor', note: 'Cloudy' });
  }

  // Moon phase - closer to 0 or 1 = new moon (darker), 0.5 = full moon (brighter)
  const moonIllumination = 1 - Math.abs(weather.moonPhase - 0.5) * 2;
  if (moonIllumination < 0.3) {
    factors.push({ label: 'Moon', status: 'good', note: 'Dark sky' });
  } else if (moonIllumination < 0.7) {
    factors.push({ label: 'Moon', status: 'fair', note: 'Partial moon' });
  } else {
    factors.push({ label: 'Moon', status: 'poor', note: 'Bright moon' });
  }

  // Aurora probability
  if (auroraProbability >= 50) {
    factors.push({ label: 'Aurora', status: 'good', note: `${auroraProbability}% chance` });
  } else if (auroraProbability >= 25) {
    factors.push({ label: 'Aurora', status: 'fair', note: `${auroraProbability}% chance` });
  } else {
    factors.push({ label: 'Aurora', status: 'poor', note: `${auroraProbability}% chance` });
  }

  // Calculate overall
  const goodCount = factors.filter((f) => f.status === 'good').length;
  const poorCount = factors.filter((f) => f.status === 'poor').length;

  let overall: 'excellent' | 'good' | 'fair' | 'poor';
  if (goodCount === 3) overall = 'excellent';
  else if (goodCount >= 2 && poorCount === 0) overall = 'good';
  else if (poorCount >= 2) overall = 'poor';
  else overall = 'fair';

  return { overall, factors };
}
