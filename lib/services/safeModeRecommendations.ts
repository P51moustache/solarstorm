/**
 * Safe Mode Recommendations Service
 * Provides proactive recommendations for satellite operators based on space weather conditions
 */

import type { Satellite, OrbitType } from '../supabase/types';
import type { SScaleLevel, SScale } from '../api/parsers/particleFlux';

// Map SScale to numeric values for proper comparison
const SSCALE_VALUES: Record<SScale, number> = {
  S0: 0,
  S1: 1,
  S2: 2,
  S3: 3,
  S4: 4,
  S5: 5,
};

function sScaleAtLeast(scale: SScale, threshold: SScale): boolean {
  return SSCALE_VALUES[scale] >= SSCALE_VALUES[threshold];
}

export type UrgencyLevel = 'none' | 'advisory' | 'watch' | 'warning' | 'critical';

export interface SafeModeRecommendation {
  id: string;
  urgency: UrgencyLevel;
  title: string;
  description: string;
  affectedOrbits: OrbitType[];
  actions: string[];
  triggers: string[];
  validUntil: string;
  issuedAt: string;
}

export interface SpaceWeatherConditions {
  kp: number;
  protonFlux10mev: number;
  electronFlux2mev: number;
  solarWindSpeed: number;
  bz: number;
  sScale: SScaleLevel;
  cmeArrivalExpected: boolean;
  cmeArrivalTime?: string;
}

export interface SafeModeAssessment {
  satellite: Satellite;
  recommendation: UrgencyLevel;
  reasons: string[];
  suggestedActions: string[];
  riskFactors: {
    factor: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    description: string;
  }[];
}

/**
 * Get urgency color for display
 */
export function getUrgencyColor(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'critical': return '#dc2626';
    case 'warning': return '#ea580c';
    case 'watch': return '#f59e0b';
    case 'advisory': return '#eab308';
    case 'none': return '#22c55e';
  }
}

/**
 * Get urgency label for display
 */
export function getUrgencyLabel(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'critical': return 'CRITICAL';
    case 'warning': return 'WARNING';
    case 'watch': return 'WATCH';
    case 'advisory': return 'ADVISORY';
    case 'none': return 'NORMAL';
  }
}

/**
 * Assess safe mode needs for a specific satellite
 */
export function assessSatelliteSafeMode(
  satellite: Satellite,
  conditions: SpaceWeatherConditions
): SafeModeAssessment {
  const reasons: string[] = [];
  const suggestedActions: string[] = [];
  const riskFactors: SafeModeAssessment['riskFactors'] = [];
  let recommendation: UrgencyLevel = 'none';

  // LEO satellites - focus on drag and atmospheric effects
  if (satellite.orbit_type === 'LEO') {
    // High Kp = thermosphere expansion = increased drag
    if (conditions.kp >= 7) {
      reasons.push('Severe geomagnetic storm causing major thermospheric expansion');
      suggestedActions.push('Prepare emergency orbit-raising maneuver');
      suggestedActions.push('Increase telemetry downlink frequency');
      riskFactors.push({
        factor: 'Atmospheric Drag',
        severity: 'critical',
        description: `Kp ${conditions.kp} causing significant density increase at LEO altitudes`,
      });
      recommendation = 'critical';
    } else if (conditions.kp >= 5) {
      reasons.push('Geomagnetic storm increasing atmospheric drag');
      suggestedActions.push('Monitor orbital elements closely');
      riskFactors.push({
        factor: 'Atmospheric Drag',
        severity: 'high',
        description: `Kp ${conditions.kp} causing moderate density increase`,
      });
      if (recommendation === 'none') recommendation = 'watch';
    }

    // Low altitude + high activity = more risk
    if (satellite.altitude_km < 400 && conditions.kp >= 4) {
      reasons.push(`Low altitude (${satellite.altitude_km} km) increases drag sensitivity`);
      suggestedActions.push('Consider altitude maintenance burn');
      riskFactors.push({
        factor: 'Low Altitude',
        severity: 'moderate',
        description: 'Satellite altitude below 400km during disturbed conditions',
      });
    }

    // Proton flux affects LEO through South Atlantic Anomaly
    if (conditions.protonFlux10mev >= 100) {
      reasons.push('Elevated proton flux - SAA passage risk increased');
      suggestedActions.push('Power down sensitive instruments during SAA passage');
      riskFactors.push({
        factor: 'Proton Radiation',
        severity: conditions.protonFlux10mev >= 1000 ? 'high' : 'moderate',
        description: 'Enhanced radiation in South Atlantic Anomaly region',
      });
      if (recommendation === 'none') recommendation = 'advisory';
    }
  }

  // MEO satellites - radiation belt effects
  if (satellite.orbit_type === 'MEO') {
    if (conditions.protonFlux10mev >= 1000) {
      reasons.push('Strong proton event - radiation belt enhancement');
      suggestedActions.push('Consider safe mode for radiation-sensitive payloads');
      suggestedActions.push('Verify single-event upset protection is active');
      riskFactors.push({
        factor: 'Radiation Belt',
        severity: 'high',
        description: 'MEO orbits traverse radiation belts during enhanced conditions',
      });
      recommendation = 'warning';
    } else if (conditions.protonFlux10mev >= 100) {
      reasons.push('Moderate proton event - monitor for SEUs');
      suggestedActions.push('Increase error-detection monitoring');
      riskFactors.push({
        factor: 'Radiation Belt',
        severity: 'moderate',
        description: 'Elevated radiation belt particle population',
      });
      if (recommendation === 'none') recommendation = 'advisory';
    }
  }

  // GEO satellites - surface charging and deep dielectric charging
  if (satellite.orbit_type === 'GEO') {
    // Electron flux causes surface charging
    if (conditions.electronFlux2mev >= 10000) {
      reasons.push('Severe electron flux - deep dielectric charging risk');
      suggestedActions.push('IMMEDIATE: Consider safe mode for all GEO assets');
      suggestedActions.push('Avoid commanding during substorm injections');
      suggestedActions.push('Monitor for anomalous telemetry');
      riskFactors.push({
        factor: 'Deep Dielectric Charging',
        severity: 'critical',
        description: 'Extreme >2 MeV electron flux can cause internal discharges',
      });
      recommendation = 'critical';
    } else if (conditions.electronFlux2mev >= 1000) {
      reasons.push('High electron flux - surface charging conditions');
      suggestedActions.push('Monitor for phantom commands');
      suggestedActions.push('Avoid eclipse-exit operations if possible');
      riskFactors.push({
        factor: 'Surface Charging',
        severity: 'high',
        description: 'Elevated electron flux can cause surface charging events',
      });
      if (recommendation === 'none' || recommendation === 'advisory') {
        recommendation = 'warning';
      }
    }

    // Substorm conditions (rapid Bz changes, high solar wind)
    if (conditions.bz <= -10 && conditions.solarWindSpeed >= 500) {
      reasons.push('Substorm conditions likely - increased charging risk');
      suggestedActions.push('Prepare for magnetopause compression');
      riskFactors.push({
        factor: 'Substorm Activity',
        severity: 'moderate',
        description: 'Southward Bz with elevated solar wind indicates substorm potential',
      });
      if (recommendation === 'none') recommendation = 'watch';
    }
  }

  // HEO satellites - multiple environment traversal
  if (satellite.orbit_type === 'HEO') {
    if (conditions.protonFlux10mev >= 100 || conditions.electronFlux2mev >= 1000) {
      reasons.push('HEO traverses multiple radiation environments');
      suggestedActions.push('Schedule operations for perigee passages');
      suggestedActions.push('Increase shielding-sensitive payload monitoring');
      riskFactors.push({
        factor: 'Multi-Environment',
        severity: 'moderate',
        description: 'HEO experiences LEO, radiation belt, and GEO-like conditions',
      });
      if (recommendation === 'none') recommendation = 'advisory';
    }
  }

  // CME arrival imminent - affects all orbits
  if (conditions.cmeArrivalExpected) {
    reasons.push(`CME arrival expected${conditions.cmeArrivalTime ? ` at ${conditions.cmeArrivalTime}` : ' soon'}`);
    suggestedActions.push('Review all safe mode procedures');
    suggestedActions.push('Ensure ground contact windows are scheduled');
    suggestedActions.push('Prepare contingency commanding');
    riskFactors.push({
      factor: 'CME Impact',
      severity: 'high',
      description: 'Coronal mass ejection will cause sudden environment changes',
    });
    if (recommendation === 'none' || recommendation === 'advisory') {
      recommendation = 'watch';
    }
  }

  // Default actions if no specific recommendations
  if (suggestedActions.length === 0) {
    suggestedActions.push('Continue normal operations');
    suggestedActions.push('Maintain standard monitoring cadence');
  }

  return {
    satellite,
    recommendation,
    reasons,
    suggestedActions,
    riskFactors,
  };
}

/**
 * Generate fleet-wide recommendations
 */
export function generateFleetRecommendations(
  satellites: Satellite[],
  conditions: SpaceWeatherConditions
): SafeModeRecommendation[] {
  const recommendations: SafeModeRecommendation[] = [];
  const now = new Date();
  const validUntil = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours

  // Critical: S3+ proton event
  if (sScaleAtLeast(conditions.sScale.scale, 'S3')) {
    recommendations.push({
      id: 'proton-event-' + now.getTime(),
      urgency: sScaleAtLeast(conditions.sScale.scale, 'S4') ? 'critical' : 'warning',
      title: `${conditions.sScale.description} Solar Radiation Storm (${conditions.sScale.scale})`,
      description: conditions.sScale.impact,
      affectedOrbits: ['LEO', 'MEO', 'GEO', 'HEO'],
      actions: [
        'Consider safe mode for radiation-sensitive payloads',
        'Increase SEU monitoring frequency',
        'Defer non-critical operations',
        'Review anomaly response procedures',
      ],
      triggers: [`>10 MeV proton flux: ${conditions.protonFlux10mev.toExponential(1)} pfu`],
      validUntil: validUntil.toISOString(),
      issuedAt: now.toISOString(),
    });
  }

  // High electron flux - GEO focus
  if (conditions.electronFlux2mev >= 1000) {
    recommendations.push({
      id: 'electron-flux-' + now.getTime(),
      urgency: conditions.electronFlux2mev >= 10000 ? 'critical' : 'warning',
      title: 'Elevated Electron Flux - Charging Conditions',
      description: 'High-energy electron flux creating surface and deep dielectric charging risk',
      affectedOrbits: ['GEO', 'HEO'],
      actions: [
        conditions.electronFlux2mev >= 10000
          ? 'IMMEDIATE: Evaluate safe mode for GEO assets'
          : 'Monitor for charging-induced anomalies',
        'Avoid operations during eclipse exit',
        'Watch for phantom commands',
        'Increase telemetry monitoring cadence',
      ],
      triggers: [`>2 MeV electron flux: ${conditions.electronFlux2mev.toExponential(1)} e/cm²·s·sr`],
      validUntil: validUntil.toISOString(),
      issuedAt: now.toISOString(),
    });
  }

  // Geomagnetic storm
  if (conditions.kp >= 5) {
    recommendations.push({
      id: 'geomag-storm-' + now.getTime(),
      urgency: conditions.kp >= 7 ? 'warning' : 'watch',
      title: `${conditions.kp >= 7 ? 'Severe' : 'Moderate'} Geomagnetic Storm (Kp ${conditions.kp})`,
      description: 'Geomagnetic storm causing thermospheric expansion and radiation belt enhancement',
      affectedOrbits: ['LEO', 'MEO'],
      actions: [
        'LEO: Monitor for increased drag, prepare for orbit maintenance',
        'MEO: Increase SEU monitoring',
        'All: Track orbital element changes',
        conditions.kp >= 7 ? 'Consider postponing critical operations' : 'Maintain heightened awareness',
      ],
      triggers: [`Kp index: ${conditions.kp}`, `Bz: ${conditions.bz.toFixed(1)} nT`],
      validUntil: validUntil.toISOString(),
      issuedAt: now.toISOString(),
    });
  }

  // CME arrival
  if (conditions.cmeArrivalExpected) {
    recommendations.push({
      id: 'cme-arrival-' + now.getTime(),
      urgency: 'watch',
      title: 'CME Arrival Expected',
      description: 'Coronal mass ejection impact will cause sudden geomagnetic and radiation changes',
      affectedOrbits: ['LEO', 'MEO', 'GEO', 'HEO'],
      actions: [
        'Review all satellite safe mode procedures',
        'Ensure ground contacts are scheduled around expected arrival',
        'Pre-position teams for 24/7 monitoring',
        'Prepare contingency command uploads',
      ],
      triggers: [
        'CME arrival imminent',
        conditions.cmeArrivalTime ? `Expected: ${conditions.cmeArrivalTime}` : 'Timing uncertain',
      ],
      validUntil: validUntil.toISOString(),
      issuedAt: now.toISOString(),
    });
  }

  // All clear if no recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'all-clear-' + now.getTime(),
      urgency: 'none',
      title: 'Normal Space Weather Conditions',
      description: 'No significant space weather threats at this time',
      affectedOrbits: [],
      actions: ['Continue normal operations', 'Maintain standard monitoring'],
      triggers: ['All indices within normal ranges'],
      validUntil: validUntil.toISOString(),
      issuedAt: now.toISOString(),
    });
  }

  return recommendations.sort((a, b) => {
    const urgencyOrder: Record<UrgencyLevel, number> = {
      critical: 0,
      warning: 1,
      watch: 2,
      advisory: 3,
      none: 4,
    };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

/**
 * Get overall fleet status based on conditions
 */
export function getFleetStatus(conditions: SpaceWeatherConditions): {
  status: UrgencyLevel;
  summary: string;
} {
  if (sScaleAtLeast(conditions.sScale.scale, 'S4') || conditions.electronFlux2mev >= 10000) {
    return {
      status: 'critical',
      summary: 'Critical space weather conditions - immediate action required',
    };
  }

  if (sScaleAtLeast(conditions.sScale.scale, 'S3') || conditions.electronFlux2mev >= 1000 || conditions.kp >= 7) {
    return {
      status: 'warning',
      summary: 'Severe conditions - safe mode evaluation recommended',
    };
  }

  if (conditions.kp >= 5 || conditions.protonFlux10mev >= 100 || conditions.cmeArrivalExpected) {
    return {
      status: 'watch',
      summary: 'Elevated activity - increased monitoring recommended',
    };
  }

  if (conditions.kp >= 4 || conditions.bz <= -5) {
    return {
      status: 'advisory',
      summary: 'Minor activity - maintain awareness',
    };
  }

  return {
    status: 'none',
    summary: 'Normal conditions - routine operations',
  };
}
