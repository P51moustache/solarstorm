import type { OrbitType } from '@/lib/supabase/types';

export interface TLEData {
  name: string;
  noradId: number;
  inclination: number;      // degrees
  eccentricity: number;
  meanMotion: number;       // revs per day
  bstar: number;            // drag term (proxy for ballistic coefficient)
  epochYear: number;
  epochDay: number;
}

export interface ParsedOrbitalParams {
  noradId: number;
  altitudeKm: number;
  inclinationDeg: number;
  ballisticCoefficient: number;
  orbitType: OrbitType;
}

// Parse standard TLE format (two lines)
export function parseTLE(line1: string, line2: string): TLEData | null {
  try {
    // Line 1: NORAD ID at columns 3-7, epoch at 19-32, BSTAR at 54-61
    const noradId = parseInt(line1.substring(2, 7).trim(), 10);
    const epochYear = parseInt(line1.substring(18, 20).trim(), 10);
    const epochDay = parseFloat(line1.substring(20, 32).trim());

    // BSTAR is in format: ±NNNNN±N (mantissa + exponent)
    const bstarStr = line1.substring(53, 61).trim();
    const bstarMantissa = parseFloat(bstarStr.substring(0, 6)) / 100000;
    const bstarExp = parseInt(bstarStr.substring(6), 10);
    const bstar = bstarMantissa * Math.pow(10, bstarExp);

    // Line 2: inclination at 9-16, eccentricity at 27-33, mean motion at 53-63
    const inclination = parseFloat(line2.substring(8, 16).trim());
    const eccentricity = parseFloat('0.' + line2.substring(26, 33).trim());
    const meanMotion = parseFloat(line2.substring(52, 63).trim());

    return {
      name: '',
      noradId,
      inclination,
      eccentricity,
      meanMotion,
      bstar,
      epochYear: epochYear > 57 ? 1900 + epochYear : 2000 + epochYear,
      epochDay,
    };
  } catch {
    return null;
  }
}

// Calculate orbital parameters from TLE
export function calculateOrbitalParams(tle: TLEData): ParsedOrbitalParams {
  const GM = 398600.4418; // km³/s² - Earth gravitational parameter
  const EARTH_RADIUS = 6371; // km

  // Calculate semi-major axis from mean motion
  const meanMotionRadSec = (tle.meanMotion * 2 * Math.PI) / 86400;
  const semiMajorAxis = Math.pow(GM / (meanMotionRadSec * meanMotionRadSec), 1/3);

  // Altitude at perigee (lowest point)
  const perigee = semiMajorAxis * (1 - tle.eccentricity) - EARTH_RADIUS;
  const apogee = semiMajorAxis * (1 + tle.eccentricity) - EARTH_RADIUS;
  const avgAltitude = (perigee + apogee) / 2;

  // Determine orbit type
  let orbitType: OrbitType;
  if (avgAltitude < 2000) {
    orbitType = 'LEO';
  } else if (avgAltitude < 20000) {
    orbitType = 'MEO';
  } else if (avgAltitude >= 35000 && avgAltitude <= 36000 && tle.inclination < 5) {
    orbitType = 'GEO';
  } else {
    orbitType = 'HEO';
  }

  // Convert BSTAR to ballistic coefficient (simplified)
  // BSTAR = Cd * A / (2 * m) * rho0, where rho0 ≈ 2.461e-5 kg/m²/Earth radius
  const ballisticCoefficient = tle.bstar > 0 ? 1 / (tle.bstar * 12756.2) : 0;

  return {
    noradId: tle.noradId,
    altitudeKm: Math.round(avgAltitude),
    inclinationDeg: tle.inclination,
    ballisticCoefficient: Math.round(ballisticCoefficient * 100) / 100,
    orbitType,
  };
}

// Fetch TLE from CelesTrak by NORAD ID
export async function fetchTLEByNoradId(noradId: number): Promise<ParsedOrbitalParams | null> {
  try {
    const response = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`
    );

    if (!response.ok) return null;

    const text = await response.text();
    const lines = text.trim().split('\n');

    if (lines.length < 3) return null;

    // Format: Line 0 = name, Line 1 = TLE line 1, Line 2 = TLE line 2
    const tle = parseTLE(lines[1], lines[2]);
    if (!tle) return null;

    tle.name = lines[0].trim();
    return calculateOrbitalParams(tle);
  } catch {
    return null;
  }
}

// Parse multiple TLEs from a text block (e.g., from CelesTrak catalog)
export function parseTLEBatch(text: string): Array<TLEData & ParsedOrbitalParams> {
  const lines = text.trim().split('\n');
  const results: Array<TLEData & ParsedOrbitalParams> = [];

  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i].trim();
    const tle = parseTLE(lines[i + 1], lines[i + 2]);

    if (tle) {
      tle.name = name;
      const params = calculateOrbitalParams(tle);
      results.push({ ...tle, ...params });
    }
  }

  return results;
}
