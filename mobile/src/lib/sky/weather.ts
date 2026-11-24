/**
 * Hourly sky weather from Open-Meteo (free, no key): cloud by layer, humidity, dew point, wind, visibility.
 * Times come back as Unix seconds, so every hour is a UTC instant and no time zone parsing is needed.
 */

/** Weather for one moment. Percentages are 0-100. */
export interface SkyWeather {
  time: Date;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  humidity: number;
  temperatureC: number;
  dewPointC: number;
  windKmh: number;
  /** Metres; null where the model has none. */
  visibilityM: number | null;
}

/** Days Open-Meteo forecasts ahead: covers tonight plus a week of "next good nights". */
export const FORECAST_DAYS = 8;

const HOURLY_FIELDS = [
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'relative_humidity_2m',
  'temperature_2m',
  'dew_point_2m',
  'wind_speed_10m',
  'visibility',
] as const;

type HourlyField = (typeof HOURLY_FIELDS)[number];

/** The part of an Open-Meteo forecast response this module reads. */
export interface OpenMeteoHourly {
  hourly: { time: number[] } & Record<HourlyField, (number | null)[]>;
  /** The place's offset from UTC, with `timezone=auto`. */
  utc_offset_seconds?: number;
}

/** A place's forecast and its clock offset, so times can read in the place's own time. */
export interface SkyForecast {
  hours: SkyWeather[];
  utcOffsetSeconds: number | null;
}

/** Past days fetched too, so a night already under way keeps its first hours. */
const PAST_DAYS = 1;

export function forecastUrl(lat: number, lng: number): string {
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=${HOURLY_FIELDS.join(',')}&timeformat=unixtime&timezone=auto` +
    `&past_days=${PAST_DAYS}&forecast_days=${FORECAST_DAYS}`
  );
}

/** Turns a response into hours, dropping any hour whose cloud layers are missing. */
export function parseHourly(json: OpenMeteoHourly): SkyWeather[] {
  const h = json.hourly;
  const out: SkyWeather[] = [];
  h.time.forEach((t, i) => {
    const low = h.cloud_cover_low[i];
    const mid = h.cloud_cover_mid[i];
    const high = h.cloud_cover_high[i];
    if (low == null || mid == null || high == null) return;
    out.push({
      time: new Date(t * 1000),
      cloudLow: low,
      cloudMid: mid,
      cloudHigh: high,
      humidity: h.relative_humidity_2m[i] ?? 0,
      temperatureC: h.temperature_2m[i] ?? 0,
      dewPointC: h.dew_point_2m[i] ?? h.temperature_2m[i] ?? 0,
      windKmh: h.wind_speed_10m[i] ?? 0,
      visibilityM: h.visibility[i] ?? null,
    });
  });
  return out;
}

/** Fetches the hourly sky weather and the place's UTC offset; null when the network or the service fails. */
export async function getSkyForecast(lat: number, lng: number): Promise<SkyForecast | null> {
  try {
    const res = await fetch(forecastUrl(lat, lng));
    if (!res.ok) return null;
    const json = (await res.json()) as OpenMeteoHourly;
    const hours = parseHourly(json);
    return hours.length ? { hours, utcOffsetSeconds: json.utc_offset_seconds ?? null } : null;
  } catch {
    return null;
  }
}

/** Fetches the hourly sky weather; null when the network or the service fails. */
export async function getSkyWeather(lat: number, lng: number): Promise<SkyWeather[] | null> {
  return (await getSkyForecast(lat, lng))?.hours ?? null;
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/**
 * Weather at any moment, read between the two forecast hours around it (hours sorted by time).
 * Null outside the forecast.
 */
export function weatherAt(hours: readonly SkyWeather[], date: Date): SkyWeather | null {
  const t = date.getTime();
  if (!hours.length || t < hours[0].time.getTime() || t > hours[hours.length - 1].time.getTime()) return null;
  let i = 0;
  while (i < hours.length - 1 && hours[i + 1].time.getTime() <= t) i++;
  const a = hours[i];
  const b = hours[Math.min(i + 1, hours.length - 1)];
  const span = b.time.getTime() - a.time.getTime();
  const f = span > 0 ? (t - a.time.getTime()) / span : 0;
  const visibilityM = a.visibilityM == null || b.visibilityM == null ? (a.visibilityM ?? b.visibilityM) : lerp(a.visibilityM, b.visibilityM, f);
  return {
    time: date,
    cloudLow: lerp(a.cloudLow, b.cloudLow, f),
    cloudMid: lerp(a.cloudMid, b.cloudMid, f),
    cloudHigh: lerp(a.cloudHigh, b.cloudHigh, f),
    humidity: lerp(a.humidity, b.humidity, f),
    temperatureC: lerp(a.temperatureC, b.temperatureC, f),
    dewPointC: lerp(a.dewPointC, b.dewPointC, f),
    windKmh: lerp(a.windKmh, b.windKmh, f),
    visibilityM,
  };
}
