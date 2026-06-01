/**
 * "Will I actually see it tonight?" — combines sky darkness, cloud cover, and
 * moonlight, which all matter as much as the aurora forecast itself.
 * Cloud + sun data from Open-Meteo (free, no key); moon phase computed locally.
 */

export interface ViewingConditions {
  cloudCover: number; // average % over tonight's dark hours
  clarity: 'Clear' | 'Partly cloudy' | 'Cloudy';
  sunset: string; // HH:MM local
  sunrise: string; // HH:MM local (next morning)
  darkNow: boolean;
  moonIllum: number; // 0-1 fraction illuminated
  moonName: string;
}

function hhmm(naiveLocal: string): string {
  // e.g. "2026-05-31T19:58" -> "19:58"
  const t = naiveLocal.split('T')[1] ?? '';
  return t.slice(0, 5);
}

/** Fraction of the Moon illuminated + phase name for a given date. */
export function moonPhase(date: Date): { illum: number; name: string } {
  const synodic = 29.53058867;
  const refDays = Date.UTC(2000, 0, 6, 18, 14) / 86_400_000; // known new moon
  const days = date.getTime() / 86_400_000;
  const age = (((days - refDays) % synodic) + synodic) % synodic;
  const illum = (1 - Math.cos((2 * Math.PI * age) / synodic)) / 2;
  let name = 'New Moon';
  if (age >= 1.85 && age < 5.5) name = 'Waxing Crescent';
  else if (age < 9.2) name = 'First Quarter';
  else if (age < 12.9) name = 'Waxing Gibbous';
  else if (age < 16.6) name = 'Full Moon';
  else if (age < 20.3) name = 'Waning Gibbous';
  else if (age < 24) name = 'Last Quarter';
  else if (age < 27.7) name = 'Waning Crescent';
  return { illum, name };
}

export async function getViewingConditions(lat: number, lng: number): Promise<ViewingConditions | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=cloud_cover&daily=sunset,sunrise&timezone=auto&forecast_days=2`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = (await res.json()) as {
      utc_offset_seconds: number;
      hourly: { time: string[]; cloud_cover: number[] };
      daily: { sunset: string[]; sunrise: string[] };
    };

    // Treat all naive-local times as a common clock by parsing them as UTC.
    const ms = (s: string) => Date.parse(s + ':00Z');
    const sunsetToday = ms(j.daily.sunset[0]);
    const sunriseTomorrow = ms(j.daily.sunrise[1] ?? j.daily.sunrise[0]);
    const sunriseToday = ms(j.daily.sunrise[0]);

    // Average cloud cover across tonight's dark hours.
    let sum = 0;
    let n = 0;
    j.hourly.time.forEach((t, i) => {
      const tm = ms(t);
      if (tm >= sunsetToday && tm <= sunriseTomorrow) {
        sum += j.hourly.cloud_cover[i];
        n++;
      }
    });
    const cloudCover = n ? Math.round(sum / n) : (j.hourly.cloud_cover[0] ?? 0);

    // Location-local "now" expressed on the same UTC clock.
    const locNow = Date.now() + j.utc_offset_seconds * 1000;
    const darkNow = locNow >= sunsetToday || locNow <= sunriseToday;

    const clarity = cloudCover <= 25 ? 'Clear' : cloudCover <= 65 ? 'Partly cloudy' : 'Cloudy';
    const moon = moonPhase(new Date());

    return {
      cloudCover,
      clarity,
      sunset: hhmm(j.daily.sunset[0]),
      sunrise: hhmm(j.daily.sunrise[1] ?? j.daily.sunrise[0]),
      darkNow,
      moonIllum: moon.illum,
      moonName: moon.name,
    };
  } catch {
    return null;
  }
}

/** One-line honest verdict combining aurora odds with viewing conditions. */
export function viewingVerdict(
  auroraProb: number,
  v: ViewingConditions
): { text: string; tone: 'good' | 'mixed' | 'poor' } {
  const cloudy = v.cloudCover > 65;
  const partly = v.cloudCover > 25;
  const brightMoon = v.moonIllum > 0.6;

  if (auroraProb < 15) {
    return { text: 'Aurora is unlikely tonight regardless of the sky.', tone: 'poor' };
  }
  if (cloudy) {
    return { text: `Decent aurora odds, but ${v.cloudCover}% cloud will likely block the view.`, tone: 'poor' };
  }
  if (partly && brightMoon) {
    return { text: 'Some cloud and a bright moon will wash out faint aurora.', tone: 'mixed' };
  }
  if (partly) {
    return { text: 'Watch for breaks in the cloud — aurora is possible.', tone: 'mixed' };
  }
  if (brightMoon) {
    return { text: 'Skies are clear, but a bright moon may mute the colors.', tone: 'mixed' };
  }
  return { text: 'Clear, dark skies — if it fires, you’ll see it. Get out there!', tone: 'good' };
}
