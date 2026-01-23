import type { OrbitType } from '@/lib/supabase/types';

export interface ManeuverWindow {
  startTime: Date;
  endTime: Date;
  quality: 'optimal' | 'acceptable' | 'risky';
  risks: string[];
  kpForecast: number;
  protonFluxForecast: number;
}

export interface ManeuverConstraints {
  orbitType: OrbitType;
  isOrbitRaising: boolean;
  requiresLowDrag: boolean;      // For LEO orbit raising
  requiresLowRadiation: boolean; // For MEO through Van Allen
  maxKp: number;
  maxProtonFlux: number;
}

const DEFAULT_CONSTRAINTS: Record<OrbitType, Partial<ManeuverConstraints>> = {
  LEO: { maxKp: 5, maxProtonFlux: 100, requiresLowDrag: true },
  MEO: { maxKp: 4, maxProtonFlux: 10, requiresLowRadiation: true },
  GEO: { maxKp: 4, maxProtonFlux: 100 },
  HEO: { maxKp: 3, maxProtonFlux: 10, requiresLowRadiation: true },
};

export function getDefaultConstraints(orbitType: OrbitType): ManeuverConstraints {
  return {
    orbitType,
    isOrbitRaising: false,
    requiresLowDrag: false,
    requiresLowRadiation: false,
    maxKp: 5,
    maxProtonFlux: 100,
    ...DEFAULT_CONSTRAINTS[orbitType],
  };
}

export function evaluateManeuverWindow(
  kp: number,
  protonFlux: number,
  electronFlux: number,
  constraints: ManeuverConstraints
): { quality: ManeuverWindow['quality']; risks: string[] } {
  const risks: string[] = [];

  if (kp > constraints.maxKp) {
    risks.push(`Kp ${kp.toFixed(1)} exceeds limit ${constraints.maxKp}`);
  }
  if (protonFlux > constraints.maxProtonFlux) {
    risks.push(`Proton flux ${protonFlux.toExponential(1)} exceeds limit ${constraints.maxProtonFlux}`);
  }
  if (constraints.requiresLowDrag && kp > 4) {
    risks.push('High atmospheric drag from geomagnetic activity');
  }
  if (constraints.requiresLowRadiation && protonFlux > 10) {
    risks.push('Elevated radiation in Van Allen belt region');
  }
  if (electronFlux > 1e4) {
    risks.push('Surface charging risk from electron flux');
  }

  let quality: ManeuverWindow['quality'];
  if (risks.length === 0 && kp <= 3 && protonFlux <= 10) {
    quality = 'optimal';
  } else if (risks.length === 0) {
    quality = 'acceptable';
  } else {
    quality = 'risky';
  }

  return { quality, risks };
}

export interface ManeuverAssessment {
  quality: ManeuverWindow['quality'];
  risks: string[];
  recommendations: string[];
  constraints: ManeuverConstraints;
}

export function assessManeuverConditions(
  orbitType: OrbitType,
  isOrbitRaising: boolean,
  kp: number,
  protonFlux: number,
  electronFlux: number
): ManeuverAssessment {
  const constraints = getDefaultConstraints(orbitType);
  constraints.isOrbitRaising = isOrbitRaising;

  // Orbit raising has stricter requirements
  if (isOrbitRaising) {
    constraints.maxKp = Math.min(constraints.maxKp, 4);
    constraints.requiresLowDrag = orbitType === 'LEO';
    constraints.requiresLowRadiation = orbitType === 'MEO' || orbitType === 'HEO';
  }

  const { quality, risks } = evaluateManeuverWindow(kp, protonFlux, electronFlux, constraints);
  const recommendations: string[] = [];

  // Generate recommendations
  if (quality === 'risky') {
    recommendations.push('Consider delaying maneuver until conditions improve');
  }

  if (constraints.requiresLowDrag && kp > 3) {
    recommendations.push('Account for increased drag in fuel budget');
  }

  if (constraints.requiresLowRadiation && (protonFlux > 10 || electronFlux > 1e3)) {
    recommendations.push('Minimize transit time through radiation belts');
  }

  if (isOrbitRaising && orbitType === 'LEO') {
    if (kp <= 2) {
      recommendations.push('Optimal conditions for orbit raising burns');
    } else if (kp > 4) {
      recommendations.push('High drag may require additional burns');
    }
  }

  if (quality === 'optimal') {
    recommendations.push('Conditions favorable for maneuver execution');
  }

  return {
    quality,
    risks,
    recommendations,
    constraints,
  };
}

// Get a color for the quality level
export function getQualityColor(quality: ManeuverWindow['quality']): string {
  switch (quality) {
    case 'optimal':
      return '#22c55e';
    case 'acceptable':
      return '#fbbf24';
    case 'risky':
      return '#dc2626';
  }
}
