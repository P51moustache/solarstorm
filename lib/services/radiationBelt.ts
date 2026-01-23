export interface RadiationBeltRisk {
  level: 'low' | 'moderate' | 'high' | 'severe';
  innerBeltFlux: number;  // Protons
  outerBeltFlux: number;  // Electrons
  slotRegionSafe: boolean;
  recommendations: string[];
  color: string;
}

export interface RadiationBeltLocation {
  inInnerBelt: boolean;
  inSlotRegion: boolean;
  inOuterBelt: boolean;
  regionName: string;
}

// Van Allen belt boundaries (approximate)
const INNER_BELT_MIN = 1000;   // km
const INNER_BELT_MAX = 6000;   // km
const SLOT_REGION_MIN = 6000;  // km
const SLOT_REGION_MAX = 13000; // km
const OUTER_BELT_MIN = 13000;  // km
const OUTER_BELT_MAX = 40000;  // km

export function isInRadiationBelt(altitudeKm: number): RadiationBeltLocation {
  const inInnerBelt = altitudeKm >= INNER_BELT_MIN && altitudeKm <= INNER_BELT_MAX;
  const inSlotRegion = altitudeKm >= SLOT_REGION_MIN && altitudeKm <= SLOT_REGION_MAX;
  const inOuterBelt = altitudeKm >= OUTER_BELT_MIN && altitudeKm <= OUTER_BELT_MAX;

  let regionName = 'Below radiation belts';
  if (inInnerBelt) regionName = 'Inner Van Allen Belt';
  else if (inSlotRegion) regionName = 'Slot Region';
  else if (inOuterBelt) regionName = 'Outer Van Allen Belt';
  else if (altitudeKm > OUTER_BELT_MAX) regionName = 'Above radiation belts';

  return {
    inInnerBelt,
    inSlotRegion,
    inOuterBelt,
    regionName,
  };
}

export function assessRadiationBeltRisk(
  altitudeKm: number,
  protonFlux: number,
  electronFlux: number,
  kp: number
): RadiationBeltRisk {
  const location = isInRadiationBelt(altitudeKm);
  const recommendations: string[] = [];

  // During storms, outer belt expands and slot region fills
  const slotRegionSafe = kp < 5 && location.inSlotRegion;

  let level: RadiationBeltRisk['level'] = 'low';

  if (location.inInnerBelt) {
    // Inner belt is relatively stable but high proton flux
    if (protonFlux > 100) {
      level = 'severe';
      recommendations.push('Minimize time in inner belt during SPE');
    } else if (protonFlux > 10) {
      level = 'high';
      recommendations.push('Monitor proton flux closely');
    } else {
      level = 'moderate';
      recommendations.push('Standard inner belt radiation environment');
    }
  } else if (location.inOuterBelt) {
    // Outer belt varies dramatically with geomagnetic activity
    if (kp >= 7 || electronFlux > 1e5) {
      level = 'severe';
      recommendations.push('Outer belt highly enhanced - delay transit if possible');
    } else if (kp >= 5 || electronFlux > 1e4) {
      level = 'high';
      recommendations.push('Elevated electron flux in outer belt');
    } else if (electronFlux > 1e3) {
      level = 'moderate';
      recommendations.push('Normal outer belt conditions');
    }
  } else if (location.inSlotRegion) {
    // Slot region normally safe but fills during storms
    if (kp >= 6) {
      level = 'high';
      recommendations.push('Slot region filling with particles during storm');
    } else if (kp >= 4) {
      level = 'moderate';
      recommendations.push('Monitor slot region conditions');
    } else {
      recommendations.push('Slot region conditions nominal');
    }
  }

  // Color based on level
  const colors = {
    low: '#22c55e',
    moderate: '#fbbf24',
    high: '#f59e0b',
    severe: '#dc2626',
  };

  return {
    level,
    innerBeltFlux: protonFlux,
    outerBeltFlux: electronFlux,
    slotRegionSafe,
    recommendations,
    color: colors[level],
  };
}

// Get risk assessment for orbit-raising through radiation belts
export function assessOrbitRaisingRadiationRisk(
  currentAltitude: number,
  targetAltitude: number,
  protonFlux: number,
  electronFlux: number,
  kp: number
): {
  transitsInnerBelt: boolean;
  transitsOuterBelt: boolean;
  maxRiskLevel: RadiationBeltRisk['level'];
  recommendations: string[];
} {
  const current = isInRadiationBelt(currentAltitude);
  const target = isInRadiationBelt(targetAltitude);

  // Determine which belts will be transited
  const transitsInnerBelt = !current.inInnerBelt && (
    target.inInnerBelt ||
    (targetAltitude > INNER_BELT_MAX && currentAltitude < INNER_BELT_MIN)
  );

  const transitsOuterBelt = !current.inOuterBelt && (
    target.inOuterBelt ||
    (targetAltitude > OUTER_BELT_MAX && currentAltitude < OUTER_BELT_MIN)
  );

  const recommendations: string[] = [];
  let maxRiskLevel: RadiationBeltRisk['level'] = 'low';

  if (transitsInnerBelt) {
    const innerRisk = assessRadiationBeltRisk(3500, protonFlux, electronFlux, kp);
    if (innerRisk.level === 'severe' || innerRisk.level === 'high') {
      maxRiskLevel = innerRisk.level;
      recommendations.push('Inner belt transit: ' + innerRisk.recommendations[0]);
    }
  }

  if (transitsOuterBelt) {
    const outerRisk = assessRadiationBeltRisk(20000, protonFlux, electronFlux, kp);
    const riskOrder = ['low', 'moderate', 'high', 'severe'];
    if (riskOrder.indexOf(outerRisk.level) > riskOrder.indexOf(maxRiskLevel)) {
      maxRiskLevel = outerRisk.level;
    }
    recommendations.push('Outer belt transit: ' + outerRisk.recommendations[0]);
  }

  if (!transitsInnerBelt && !transitsOuterBelt) {
    recommendations.push('Orbit raising does not transit radiation belts');
  }

  return {
    transitsInnerBelt,
    transitsOuterBelt,
    maxRiskLevel,
    recommendations,
  };
}
