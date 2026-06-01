/**
 * Aurora visibility math — ported from the web app's lib/services
 * (location.ts + auroraProbability.ts), dependency-free.
 */

/** Geomagnetic latitude via dipole approximation (magnetic N pole ~80.7°N, 72.7°W). */
export function magneticLatitude(lat: number, lng: number): number {
  const poleLat = 80.7 * (Math.PI / 180);
  const poleLng = -72.7 * (Math.PI / 180);
  const latR = lat * (Math.PI / 180);
  const lngR = lng * (Math.PI / 180);
  const magLat = Math.asin(
    Math.sin(latR) * Math.sin(poleLat) +
      Math.cos(latR) * Math.cos(poleLat) * Math.cos(lngR - poleLng)
  );
  return magLat * (180 / Math.PI);
}

/** Approximate equatorward boundary (geomagnetic latitude) of the aurora for a given Kp. */
export function auroraViewingLatitude(kp: number): number {
  const boundaries: Record<number, number> = {
    0: 67, 1: 65, 2: 63, 3: 60, 4: 57, 5: 53, 6: 50, 7: 47, 8: 44, 9: 40,
  };
  const k = Math.min(9, Math.max(0, kp));
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  if (lo === hi) return boundaries[lo];
  return boundaries[lo] + (boundaries[hi] - boundaries[lo]) * (k - lo);
}

/**
 * Smallest whole Kp at which the auroral oval reaches a location's magnetic
 * latitude (i.e. aurora becomes possible overhead). Returns null if even Kp 9
 * doesn't reach it.
 */
export function kpNeededForVisibility(lat: number, lng: number): number | null {
  const absLat = Math.abs(magneticLatitude(lat, lng));
  for (let kp = 0; kp <= 9; kp++) {
    if (auroraViewingLatitude(kp) <= absLat) return kp;
  }
  return null;
}

export interface AuroraPrediction {
  probability: number; // 0-100
  description: string;
  bestViewingTime: string | null;
}

/** Combine Kp, Bz, solar-wind speed, and the viewer's magnetic latitude into a 0-100 chance. */
export function auroraProbability(
  lat: number,
  lng: number,
  kp: number,
  bz: number | null,
  speed: number | null
): AuroraPrediction {
  const absLat = Math.abs(magneticLatitude(lat, lng));
  const viewing = auroraViewingLatitude(kp);

  let kpC = 5;
  if (kp >= 7) kpC = 40;
  else if (kp >= 5) kpC = 30;
  else if (kp >= 4) kpC = 20;
  else if (kp >= 3) kpC = 10;

  let bzC = 0;
  if (bz != null) {
    if (bz <= -10) bzC = 30;
    else if (bz <= -5) bzC = 20;
    else if (bz <= -2) bzC = 10;
    else if (bz < 0) bzC = 5;
  }

  let latC = 0;
  const diff = absLat - viewing;
  if (diff >= 5) latC = 30;
  else if (diff >= 0) latC = 25;
  else if (diff >= -5) latC = 15;
  else if (diff >= -10) latC = 5;

  let speedC = 0;
  if (speed != null) {
    if (speed >= 700) speedC = 15;
    else if (speed >= 500) speedC = 10;
    else if (speed >= 400) speedC = 5;
  }

  const probability = Math.min(100, Math.max(0, kpC + bzC + latC + speedC));

  let description: string;
  if (probability >= 70) description = 'Excellent — aurora likely visible at your location.';
  else if (probability >= 50) description = 'Good — aurora possible with clear, dark skies.';
  else if (probability >= 30) description = 'Moderate — watch for an uptick in activity.';
  else if (probability >= 15) description = 'Low — may be visible toward the northern horizon.';
  else description = 'Unlikely at your latitude — head further north for a chance.';

  return {
    probability,
    description,
    bestViewingTime: probability >= 30 ? '10 PM – 2 AM local' : null,
  };
}
