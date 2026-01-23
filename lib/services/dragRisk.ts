import type { Satellite } from '../supabase/types';

export interface DragRiskAssessment {
  satellite: Satellite;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  densityIncreaseFactor: number;
  estimatedDecayDays: number | null;
  recommendation: string;
  color: string;
}

export interface ThermosphericConditions {
  kp: number;
  f107: number; // Solar flux index
  apIndex: number; // Geomagnetic index
}

// Simplified NRLMSISE-00 density model approximation
// Real implementation would use full atmospheric model
function estimateDensityIncrease(
  altitudeKm: number,
  kp: number,
  f107: number = 150
): number {
  // Base density increase factor from Kp
  // Higher Kp = more geomagnetic heating = thermosphere expansion = higher density at altitude
  const kpFactor = 1 + (kp / 9) * 2.5; // Up to 3.5x at Kp=9

  // F10.7 solar flux effect (higher flux = more heating)
  const f107Factor = 1 + ((f107 - 70) / 230) * 1.5; // 70-300 SFU range

  // Altitude scaling - effect is stronger at lower LEO
  const altitudeFactor = altitudeKm < 300 ? 1.5 :
                         altitudeKm < 400 ? 1.3 :
                         altitudeKm < 500 ? 1.1 :
                         altitudeKm < 600 ? 1.0 : 0.8;

  return kpFactor * f107Factor * altitudeFactor;
}

// Simplified decay estimation
function estimateDecayDays(
  altitudeKm: number,
  ballisticCoefficient: number | null,
  densityFactor: number
): number | null {
  if (!ballisticCoefficient) return null;

  // Rough approximation - real calculation needs orbital mechanics
  // Higher ballistic coefficient = more drag = faster decay
  const baseDecay = altitudeKm < 300 ? 30 :
                    altitudeKm < 400 ? 180 :
                    altitudeKm < 500 ? 730 :
                    altitudeKm < 600 ? 3650 : 36500;

  // Adjust for ballistic coefficient (typical range 20-200 kg/m²)
  const bcFactor = 50 / (ballisticCoefficient || 50);

  // Adjust for density increase
  const decayDays = baseDecay / (densityFactor * bcFactor);

  return Math.round(decayDays);
}

export function calculateDragRisk(
  satellite: Satellite,
  kp: number,
  f107: number = 150
): DragRiskAssessment {
  // Only calculate for LEO satellites
  if (satellite.orbit_type !== 'LEO') {
    return {
      satellite,
      riskLevel: 'low',
      densityIncreaseFactor: 1,
      estimatedDecayDays: null,
      recommendation: 'Drag risk not applicable for non-LEO orbits',
      color: '#22c55e',
    };
  }

  const densityFactor = estimateDensityIncrease(satellite.altitude_km, kp, f107);
  const decayDays = estimateDecayDays(
    satellite.altitude_km,
    satellite.ballistic_coefficient,
    densityFactor
  );

  // Determine risk level
  let riskLevel: DragRiskAssessment['riskLevel'];
  let recommendation: string;
  let color: string;

  if (densityFactor >= 3 || (decayDays !== null && decayDays < 30)) {
    riskLevel = 'critical';
    color = '#dc2626';
    recommendation = satellite.is_orbit_raising
      ? 'URGENT: Accelerate orbit-raising burns immediately before storm peak'
      : 'Consider emergency orbit-raising maneuver if fuel available';
  } else if (densityFactor >= 2.5 || (decayDays !== null && decayDays < 90)) {
    riskLevel = 'high';
    color = '#f59e0b';
    recommendation = satellite.is_orbit_raising
      ? 'Recommend advancing scheduled orbit-raising burns'
      : 'Monitor closely; prepare contingency maneuver plan';
  } else if (densityFactor >= 1.5 || (decayDays !== null && decayDays < 180)) {
    riskLevel = 'moderate';
    color = '#fbbf24';
    recommendation = 'Increased drag expected; monitor orbital elements';
  } else {
    riskLevel = 'low';
    color = '#22c55e';
    recommendation = 'Normal operations; no immediate drag concerns';
  }

  return {
    satellite,
    riskLevel,
    densityIncreaseFactor: Math.round(densityFactor * 100) / 100,
    estimatedDecayDays: decayDays,
    recommendation,
    color,
  };
}

export function calculateFleetDragRisk(
  satellites: Satellite[],
  kp: number,
  f107: number = 150
): DragRiskAssessment[] {
  return satellites
    .filter((s) => s.orbit_type === 'LEO')
    .map((s) => calculateDragRisk(s, kp, f107))
    .sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });
}
