/**
 * The sky score: 0-100 for how good the sky is for stargazing at one moment.
 * Each condition gives a factor from 0 (ruins the view) to 1 (no effect); the score is their product,
 * so any one of them can spoil a night on its own, as a real overcast or a sunlit sky does.
 */
import type { SkyState } from './darkness';
import type { SkyWeather } from './weather';

/** What a moment's score is made of, each 0-1. */
export interface ScoreFactors {
  /** Sun below the horizon far enough for a dark sky. */
  darkness: number;
  /** Moonlight washing out faint stars. */
  moon: number;
  /** Share of sky not hidden by cloud. */
  clouds: number;
  /** Haze and dew on optics from damp air. */
  humidity: number;
  /** Fog or mist near the ground. */
  visibility: number;
  /** Shake and cold from wind. */
  wind: number;
}

export type ScoreFactor = keyof ScoreFactors;

export interface SkyScore {
  /** 0-100. */
  score: number;
  factors: ScoreFactors;
  /** The factor that costs the most tonight, or null when nothing costs anything. */
  limitedBy: ScoreFactor | null;
}

/** Tuning, with the reason for each value. */
export const ScoreWeights = {
  /** A full Moon high up still leaves bright stars and planets: it takes 60% off, not all of it. */
  moonMaxPenalty: 0.6,
  /** Thin high cirrus dims the sky but stars show through; low and mid cloud block it. */
  highCloudOpacity: 0.5,
  /** Humidity starts to matter above 70% and is at its worst by 95%: haze and dewed lenses. */
  humidityFrom: 70,
  humidityTo: 95,
  humidityMaxPenalty: 0.2,
  /** Dew point within this many degrees of the air means dew forms on the gear. */
  dewSpreadC: 2,
  dewPenalty: 0.1,
  /** Below 10 km is mist; at 1 km and under it is fog that hides the sky. */
  visibilityClearM: 10_000,
  visibilityFogM: 1_000,
  /** Wind above 20 km/h shakes a tripod; by 50 km/h viewing is miserable. */
  windFromKmh: 20,
  windToKmh: 50,
  windMaxPenalty: 0.3,
} as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 at `from`, 1 at `to`, linear between. */
const ramp = (x: number, from: number, to: number) => clamp01((x - from) / (to - from));

/** The factor that drags the score down most, if any factor is below 1. */
function limitingFactor(f: ScoreFactors): ScoreFactor | null {
  let worst: ScoreFactor | null = null;
  for (const key of Object.keys(f) as ScoreFactor[]) {
    if (f[key] < 1 && (worst === null || f[key] < f[worst])) worst = key;
  }
  return worst;
}

export function cloudFactor(w: Pick<SkyWeather, 'cloudLow' | 'cloudMid' | 'cloudHigh'>): number {
  const clear = (pct: number, opacity = 1) => 1 - (clamp01(pct / 100) * opacity);
  return clear(w.cloudLow) * clear(w.cloudMid) * clear(w.cloudHigh, ScoreWeights.highCloudOpacity);
}

function humidityFactor(w: SkyWeather): number {
  const W = ScoreWeights;
  const haze = W.humidityMaxPenalty * ramp(w.humidity, W.humidityFrom, W.humidityTo);
  const dew = w.temperatureC - w.dewPointC <= W.dewSpreadC ? W.dewPenalty : 0;
  return 1 - haze - dew;
}

function visibilityFactor(w: SkyWeather): number {
  if (w.visibilityM == null) return 1;
  return ramp(w.visibilityM, ScoreWeights.visibilityFogM, ScoreWeights.visibilityClearM);
}

function windFactor(w: SkyWeather): number {
  return 1 - ScoreWeights.windMaxPenalty * ramp(w.windKmh, ScoreWeights.windFromKmh, ScoreWeights.windToKmh);
}

/** Scores one moment from its sky and weather. Without weather, only the sky counts. */
export function scoreSky(sky: SkyState, weather: SkyWeather | null): SkyScore {
  const factors: ScoreFactors = {
    darkness: sky.sunDarkness,
    moon: 1 - ScoreWeights.moonMaxPenalty * sky.moonGlow,
    clouds: weather ? cloudFactor(weather) : 1,
    humidity: weather ? humidityFactor(weather) : 1,
    visibility: weather ? visibilityFactor(weather) : 1,
    wind: weather ? windFactor(weather) : 1,
  };
  const product = Object.values(factors).reduce((a, b) => a * b, 1);
  return { score: Math.round(100 * product), factors, limitedBy: limitingFactor(factors) };
}
