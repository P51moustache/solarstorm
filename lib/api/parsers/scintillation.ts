// Scintillation indices
export interface ScintillationReading {
  timestamp: string;
  lat: number;
  lng: number;
  s4: number | null; // Amplitude scintillation (0-1+)
  sigmaPhi: number | null; // Phase scintillation (radians)
}

export interface ScintillationForecast {
  timestamp: string;
  region: string;
  s4Expected: number;
  sigmaPhiExpected: number;
  probability: number; // 0-100
  severity: ScintillationSeverity;
}

export type ScintillationSeverity = 'none' | 'weak' | 'moderate' | 'strong' | 'severe';

export interface ScintillationCondition {
  severity: ScintillationSeverity;
  description: string;
  gnssImpact: string;
  lossOfLockRisk: 'low' | 'moderate' | 'high' | 'very_high';
  color: string;
}

// Assess scintillation severity from S4 index
export function getScintillationSeverity(s4: number): ScintillationCondition {
  if (s4 >= 1.0) {
    return {
      severity: 'severe',
      description: 'Severe scintillation',
      gnssImpact: 'Frequent loss of lock expected. GNSS operations severely degraded. Consider pausing precision work.',
      lossOfLockRisk: 'very_high',
      color: '#dc2626',
    };
  } else if (s4 >= 0.6) {
    return {
      severity: 'strong',
      description: 'Strong scintillation',
      gnssImpact: 'Intermittent loss of lock likely. RTK/PPP may have difficulty maintaining fix. Increase reacquisition time.',
      lossOfLockRisk: 'high',
      color: '#f59e0b',
    };
  } else if (s4 >= 0.3) {
    return {
      severity: 'moderate',
      description: 'Moderate scintillation',
      gnssImpact: 'Occasional signal fading. Some receivers may lose lock briefly. Monitor carrier-to-noise ratios.',
      lossOfLockRisk: 'moderate',
      color: '#fbbf24',
    };
  } else if (s4 >= 0.1) {
    return {
      severity: 'weak',
      description: 'Weak scintillation',
      gnssImpact: 'Minor signal fluctuations. Most receivers unaffected. Good for precision operations.',
      lossOfLockRisk: 'low',
      color: '#84cc16',
    };
  }

  return {
    severity: 'none',
    description: 'No scintillation',
    gnssImpact: 'Stable signal conditions. Ideal for precision GNSS operations.',
    lossOfLockRisk: 'low',
    color: '#22c55e',
  };
}

// Phase scintillation assessment
export function getPhaseScintillationImpact(sigmaPhi: number): {
  impact: string;
  carrierTrackingRisk: 'low' | 'moderate' | 'high';
} {
  if (sigmaPhi >= 0.5) {
    return {
      impact: 'Severe phase variations. Carrier tracking loops may fail.',
      carrierTrackingRisk: 'high',
    };
  } else if (sigmaPhi >= 0.2) {
    return {
      impact: 'Significant phase noise. Precision carrier measurements degraded.',
      carrierTrackingRisk: 'moderate',
    };
  }

  return {
    impact: 'Normal phase stability.',
    carrierTrackingRisk: 'low',
  };
}

// Predict scintillation risk based on geomagnetic activity and local time
export function predictScintillationRisk(
  kp: number,
  lat: number,
  localHour: number,
  month: number
): {
  equatorialRisk: ScintillationSeverity;
  auroralRisk: ScintillationSeverity;
  description: string;
} {
  const absLat = Math.abs(lat);

  // Equatorial scintillation (±20° magnetic latitude)
  // Peaks after sunset (19:00-01:00 local), stronger during equinoxes
  let equatorialRisk: ScintillationSeverity = 'none';
  if (absLat <= 25) {
    const isEquinox = (month >= 2 && month <= 4) || (month >= 8 && month <= 10);
    const isPostSunset = localHour >= 19 || localHour <= 1;

    if (isPostSunset) {
      equatorialRisk = isEquinox ? 'strong' : 'moderate';
    } else if (localHour >= 17 || localHour <= 3) {
      equatorialRisk = isEquinox ? 'moderate' : 'weak';
    }
  }

  // Auroral scintillation (high latitudes, Kp-dependent)
  let auroralRisk: ScintillationSeverity = 'none';
  if (absLat >= 55) {
    if (kp >= 7) {
      auroralRisk = 'severe';
    } else if (kp >= 5) {
      auroralRisk = 'strong';
    } else if (kp >= 4) {
      auroralRisk = 'moderate';
    } else if (kp >= 3) {
      auroralRisk = 'weak';
    }
  }

  let description = '';
  if (equatorialRisk !== 'none' && absLat <= 25) {
    description = `Equatorial scintillation risk: ${equatorialRisk}. Post-sunset ionospheric irregularities expected.`;
  } else if (auroralRisk !== 'none' && absLat >= 55) {
    description = `Auroral scintillation risk: ${auroralRisk}. Kp=${kp} driving high-latitude ionospheric disturbances.`;
  } else {
    description = 'Low scintillation risk at this location and time.';
  }

  return { equatorialRisk, auroralRisk, description };
}
