/**
 * How dark the sky is at a place and moment: where the Sun and Moon are, how much of the Moon is lit,
 * and the night's twilight bounds. Pure and offline (astronomy-engine); every time is a UTC instant.
 */
import { Body, Equator, Horizon, Illumination, Observer, SearchAltitude, SearchRiseSet } from 'astronomy-engine';

/** A place on Earth, in degrees. */
export interface Place {
  lat: number;
  lng: number;
}

/** How far into the night the Sun has gone, from brightest to darkest. */
export type TwilightPhase = 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';

/** Sun altitudes (degrees) that bound each twilight phase; standard definitions. */
export const SunAltitude = {
  /** Rise and set, upper limb with refraction (what SearchRiseSet uses). */
  horizon: -0.833,
  civil: -6,
  nautical: -12,
  astronomical: -18,
} as const;

/** Moon altitude (degrees) at which its glow counts in full; lower, its light passes more air and is fainter. */
const MOON_FULL_GLOW_ALTITUDE = 30;

/** The sky at one moment. */
export interface SkyState {
  sunAltitude: number;
  moonAltitude: number;
  /** Fraction of the Moon's disc lit, 0-1. */
  moonIllumination: number;
  phase: TwilightPhase;
  /** How dark the Sun lets the sky get, 0 (civil twilight or brighter) to 1 (astronomical night). */
  sunDarkness: number;
  /** How much moonlight brightens the sky, 0 (down or new) to 1 (full and high). */
  moonGlow: number;
}

/** Tonight's bounds. Any of them is null when it does not happen (polar day or night). */
export interface NightBounds {
  sunset: Date | null;
  /** When the sky reaches its darkest phase tonight (astronomical, or nautical/civil in a bright summer). */
  dusk: Date | null;
  dawn: Date | null;
  sunrise: Date | null;
  /** The darkest phase the sky reaches tonight. */
  darkest: TwilightPhase;
}

const DAY = 1;

function observer(place: Place): Observer {
  return new Observer(place.lat, place.lng, 0);
}

function altitude(body: Body, date: Date, obs: Observer): number {
  const eq = Equator(body, date, obs, true, true);
  return Horizon(date, obs, eq.ra, eq.dec, 'normal').altitude;
}

/** Twilight phase for a Sun altitude. */
export function phaseFor(sunAltitude: number): TwilightPhase {
  if (sunAltitude > SunAltitude.horizon) return 'day';
  if (sunAltitude > SunAltitude.civil) return 'civil';
  if (sunAltitude > SunAltitude.nautical) return 'nautical';
  if (sunAltitude > SunAltitude.astronomical) return 'astronomical';
  return 'night';
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0 at the end of civil twilight, rising evenly to 1 at astronomical night. */
export function sunDarknessFor(sunAltitude: number): number {
  return clamp01((SunAltitude.civil - sunAltitude) / (SunAltitude.civil - SunAltitude.astronomical));
}

/** Moonlight on the sky: lit fraction, faded when the Moon is low and zero when it is down. */
export function moonGlowFor(moonAltitude: number, moonIllumination: number): number {
  if (moonAltitude <= 0) return 0;
  return clamp01(moonIllumination) * clamp01(moonAltitude / MOON_FULL_GLOW_ALTITUDE);
}

/** The sky at `date` over `place`. */
export function skyAt(place: Place, date: Date): SkyState {
  const obs = observer(place);
  const sunAltitude = altitude(Body.Sun, date, obs);
  const moonAltitude = altitude(Body.Moon, date, obs);
  const moonIllumination = Illumination(Body.Moon, date).phase_fraction;
  return {
    sunAltitude,
    moonAltitude,
    moonIllumination,
    phase: phaseFor(sunAltitude),
    sunDarkness: sunDarknessFor(sunAltitude),
    moonGlow: moonGlowFor(moonAltitude, moonIllumination),
  };
}

const toDate = (t: { date: Date } | null) => (t ? t.date : null);

/** Darkest phases worth a dusk and dawn, each with the Sun altitude where it begins. */
const DARK_PHASES: readonly { phase: TwilightPhase; begins: number }[] = [
  { phase: 'night', begins: SunAltitude.astronomical },
  { phase: 'astronomical', begins: SunAltitude.nautical },
  { phase: 'nautical', begins: SunAltitude.civil },
];

const HOUR_MS = 3_600_000;

/** Darkest phase over the next day, sampled hourly: for skies where the Sun neither rises nor sets. */
function darkestWithoutSunset(obs: Observer, now: Date): TwilightPhase {
  let lowest = Infinity;
  for (let h = 0; h <= 24; h++) lowest = Math.min(lowest, altitude(Body.Sun, new Date(now.getTime() + h * HOUR_MS), obs));
  return phaseFor(lowest);
}

/**
 * The night in progress at `now`, or the next one if the Sun is up.
 * Where the Sun neither sets nor rises within a day (polar day or night), sunset and sunrise are null,
 * dusk and dawn are null, and `darkest` is the darkest phase of the coming day.
 */
export function nightBounds(place: Place, now: Date): NightBounds {
  const obs = observer(place);
  const sunUp = altitude(Body.Sun, now, obs) > SunAltitude.horizon;
  const sunset = toDate(SearchRiseSet(Body.Sun, obs, -1, now, sunUp ? DAY : -DAY));
  if (!sunset) {
    return { sunset: null, dusk: null, dawn: null, sunrise: null, darkest: darkestWithoutSunset(obs, now) };
  }
  const sunrise = toDate(SearchRiseSet(Body.Sun, obs, +1, sunset, DAY));
  const span = sunrise ? (sunrise.getTime() - sunset.getTime()) / 86_400_000 : DAY;

  for (const { phase, begins } of DARK_PHASES) {
    const dusk = toDate(SearchAltitude(Body.Sun, obs, -1, sunset, span, begins));
    if (!dusk) continue;
    const dawn = toDate(SearchAltitude(Body.Sun, obs, +1, dusk, DAY, begins));
    return { sunset, dusk, dawn, sunrise, darkest: phase };
  }
  return { sunset, dusk: null, dawn: null, sunrise, darkest: 'civil' };
}
