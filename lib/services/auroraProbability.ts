import { getAuroraViewingLatitude, calculateMagneticLatitude } from './location';

export interface AuroraPrediction {
  probability: number; // 0-100
  description: string;
  bestViewingTime: string | null;
  factors: {
    kp: { value: number; contribution: number };
    bz: { value: number; contribution: number };
    magneticLat: { value: number; contribution: number };
    speed: { value: number; contribution: number };
  };
}

export function calculateAuroraProbability(
  lat: number,
  lng: number,
  kp: number,
  bz: number,
  speed: number
): AuroraPrediction {
  const magLat = calculateMagneticLatitude(lat, lng);
  const absLat = Math.abs(magLat);
  const viewingLatitude = getAuroraViewingLatitude(kp);

  // Base probability from Kp index
  let kpContribution = 0;
  if (kp >= 7) kpContribution = 40;
  else if (kp >= 5) kpContribution = 30;
  else if (kp >= 4) kpContribution = 20;
  else if (kp >= 3) kpContribution = 10;
  else kpContribution = 5;

  // Bz contribution (southward is better)
  let bzContribution = 0;
  if (bz <= -10) bzContribution = 30;
  else if (bz <= -5) bzContribution = 20;
  else if (bz <= -2) bzContribution = 10;
  else if (bz < 0) bzContribution = 5;
  else bzContribution = 0;

  // Location contribution (closer to aurora oval = better)
  let latContribution = 0;
  const latDiff = absLat - viewingLatitude;
  if (latDiff >= 5) latContribution = 30; // Well inside oval
  else if (latDiff >= 0) latContribution = 25; // At edge
  else if (latDiff >= -5) latContribution = 15; // Just outside
  else if (latDiff >= -10) latContribution = 5; // Further out
  else latContribution = 0; // Too far south

  // Solar wind speed contribution
  let speedContribution = 0;
  if (speed >= 700) speedContribution = 15;
  else if (speed >= 500) speedContribution = 10;
  else if (speed >= 400) speedContribution = 5;
  else speedContribution = 0;

  // Calculate total probability
  const rawProbability = kpContribution + bzContribution + latContribution + speedContribution;
  const probability = Math.min(100, Math.max(0, rawProbability));

  // Generate description
  let description: string;
  if (probability >= 70) {
    description = 'Excellent conditions! Aurora likely visible at your location.';
  } else if (probability >= 50) {
    description = 'Good conditions. Aurora possible with clear skies.';
  } else if (probability >= 30) {
    description = 'Moderate conditions. Watch for activity increase.';
  } else if (probability >= 15) {
    description = 'Low probability. Aurora may be visible to the north.';
  } else {
    description = 'Unlikely at your latitude. Consider traveling north.';
  }

  // Best viewing time (simplified - local midnight in aurora zone)
  const bestViewingTime = probability >= 30 ? '10 PM - 2 AM local time' : null;

  return {
    probability,
    description,
    bestViewingTime,
    factors: {
      kp: { value: kp, contribution: kpContribution },
      bz: { value: bz, contribution: bzContribution },
      magneticLat: { value: absLat, contribution: latContribution },
      speed: { value: speed, contribution: speedContribution },
    },
  };
}
