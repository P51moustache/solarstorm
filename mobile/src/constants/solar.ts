/**
 * SolarStorm dark palette + space-weather scale helpers.
 * Astronomy-friendly dark UI, NOAA G-scale color coding for the Kp index.
 */

export const Palette = {
  bg: '#05060A',
  surface: '#0E1119',
  surfaceAlt: '#161A24',
  border: '#222838',
  text: '#F3F5FA',
  textDim: '#9AA3B4',
  textFaint: '#5C6678',
  accent: '#4C8DFF',
  good: '#2ECC71',
  warn: '#F1C40F',
  danger: '#FF6B5B',
} as const;

export const Fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

/**
 * Translates current conditions into a plain-language "mood" for the sky,
 * plus a 0-1 intensity and palette that drives the living aurora backdrop.
 */
export function skyMood(
  kp: number | null,
  bz: number | null
): { word: string; headline: string; sub: string; intensity: number; colors: string[] } {
  if (kp === null) {
    return {
      word: 'unknown',
      headline: 'Reading the sky…',
      sub: 'Fetching live space-weather conditions.',
      intensity: 0.15,
      colors: ['#1B2A4A', '#16324F'],
    };
  }
  const southward = bz != null && bz < -2;
  const boost = southward ? 0.5 : 0;
  const level = kp + boost;

  if (level >= 7)
    return {
      word: 'on fire',
      headline: 'The sky is on fire',
      sub: 'A major storm — aurora could be overhead and vivid.',
      intensity: 1,
      colors: ['#00E08A', '#7A5CFF', '#FF4D8D'],
    };
  if (level >= 5)
    return {
      word: 'awake',
      headline: 'The sky is awake',
      sub: 'A geomagnetic storm is underway. Worth looking up.',
      intensity: 0.8,
      colors: ['#19D98A', '#5C8CFF', '#A86BFF'],
    };
  if (level >= 3.5)
    return {
      word: 'stirring',
      headline: 'The sky is stirring',
      sub: 'Activity is picking up. Keep an eye north.',
      intensity: 0.55,
      colors: ['#27C77A', '#3E6FD0'],
    };
  if (level >= 2)
    return {
      word: 'restless',
      headline: 'The sky is restless',
      sub: 'Low activity — aurora possible at high latitudes.',
      intensity: 0.35,
      colors: ['#2E9E66', '#274B86'],
    };
  return {
    word: 'asleep',
    headline: 'The sky is asleep',
    sub: 'Calm and quiet. Aurora unlikely tonight.',
    intensity: 0.18,
    colors: ['#1F8A5B', '#1B2A4A'],
  };
}

/** Plain-language explainers for newcomers — keyed by term. */
export const GLOSSARY: Record<string, { title: string; body: string }> = {
  kp: {
    title: 'What is the Kp index?',
    body: 'Kp is a 0–9 scale of how disturbed Earth’s magnetic field is right now. The higher it climbs, the further the aurora spreads from the poles — and the better your odds of seeing it.',
  },
  bz: {
    title: 'What is Bz?',
    body: 'The solar wind carries the Sun’s magnetic field. Bz is its north–south tilt. When Bz points south (a negative number), it locks onto Earth’s field and pours energy in — the single best predictor of aurora.',
  },
  speed: {
    title: 'Solar wind speed',
    body: 'How fast the stream of particles from the Sun is hitting Earth, in km/s. A fast wind (500+) hits harder and brightens the aurora. A gust above 700 often means a storm is brewing.',
  },
  oval: {
    title: 'The auroral oval',
    body: 'Aurora forms in a ring around each magnetic pole. During storms that ring widens toward the equator. If the ring reaches your latitude, the lights can be directly overhead.',
  },
  scales: {
    title: 'The NOAA space-weather scales',
    body: 'NOAA rates three hazards 0–5. R = Radio Blackouts (from solar flares, hits HF comms & GPS). S = Solar Radiation Storms (energetic protons, a risk to satellites, astronauts, and polar flights). G = Geomagnetic Storms (the aurora driver, and a grid/satellite-drag concern).',
  },
  flares: {
    title: 'Solar flare classes',
    body: 'X-ray flares are graded A, B, C, M, X — each letter is 10× stronger than the last. C-class is minor; M-class can cause brief radio blackouts; X-class is major and can disrupt HF comms, GPS, and satellites on Earth’s dayside.',
  },
  radiation: {
    title: 'Radiation storms (S-scale)',
    body: 'After big flares/CMEs the Sun floods near-Earth space with high-energy protons. These can degrade satellite electronics and solar panels, raise radiation on polar flights, and force spacecraft into safe mode.',
  },
  aurora: {
    title: 'Your aurora chance',
    body: 'We combine the storm strength (Kp), the magnetic field direction (Bz), the wind speed, and how far north you are into a single estimate of your odds tonight. Dark, clear skies still matter!',
  },
};

export interface KpScale {
  label: string; // e.g. "G1 — Minor"
  color: string;
}

/** NOAA geomagnetic storm scale + color coding for a given Kp value. */
export function kpScale(kp: number | null): KpScale {
  if (kp === null) return { label: 'No data', color: Palette.textFaint };
  if (kp >= 9) return { label: 'G5 — Extreme', color: '#C03A2B' };
  if (kp >= 8) return { label: 'G4 — Severe', color: '#E74C3C' };
  if (kp >= 7) return { label: 'G3 — Strong', color: '#FF6B5B' };
  if (kp >= 6) return { label: 'G2 — Moderate', color: '#FF9F43' };
  if (kp >= 5) return { label: 'G1 — Minor', color: '#F1C40F' };
  if (kp >= 4) return { label: 'Active', color: '#7FD17F' };
  if (kp >= 2) return { label: 'Unsettled', color: '#2ECC71' };
  return { label: 'Quiet', color: '#27AE60' };
}

/**
 * Rough aurora likelihood from Kp and the IMF Bz component.
 * Southward (negative) Bz strongly favors aurora; this is a heuristic for the
 * dashboard headline, not a substitute for the OVATION model.
 */
export function auroraLikelihood(kp: number | null, bz: number | null): {
  label: string;
  color: string;
} {
  if (kp === null) return { label: 'Unknown', color: Palette.textFaint };
  let score = kp;
  if (bz !== null && bz < -5) score += 1.5;
  else if (bz !== null && bz < 0) score += 0.5;

  if (score >= 7) return { label: 'Very High', color: '#FF6B5B' };
  if (score >= 5.5) return { label: 'High', color: '#FF9F43' };
  if (score >= 4) return { label: 'Moderate', color: '#F1C40F' };
  if (score >= 2.5) return { label: 'Low', color: '#7FD17F' };
  return { label: 'Minimal', color: '#2ECC71' };
}

/** Color for a NOAA 0-5 scale (R/S/G). */
export function noaaScaleColor(scale: number): string {
  if (scale >= 5) return '#C03A2B';
  if (scale >= 4) return '#E74C3C';
  if (scale >= 3) return '#FF6B5B';
  if (scale >= 2) return '#FF9F43';
  if (scale >= 1) return '#F1C40F';
  return '#2ECC71';
}

/** Color for a solar flare class string like "C1.5", "M2.0", "X1". */
export function flareColor(cls: string): string {
  const c = (cls || '').trim().toUpperCase()[0];
  if (c === 'X') return '#E74C3C';
  if (c === 'M') return '#FF9F43';
  if (c === 'C') return '#F1C40F';
  return '#2ECC71'; // A/B = quiet
}

export function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z')).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
