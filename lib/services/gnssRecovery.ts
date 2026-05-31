/**
 * GNSS Recovery Time Estimation
 *
 * Estimates how long until GNSS conditions return to normal based on:
 * - Current Kp index and trend
 * - TEC levels
 * - Time of day (ionospheric decay patterns)
 * - Kp forecast data (if available)
 */

export interface GnssRecoveryEstimate {
  /** Estimated hours until normal conditions */
  hoursToRecovery: number;
  /** Confidence level of the estimate */
  confidence: 'high' | 'moderate' | 'low';
  /** Human-readable description */
  description: string;
  /** Factors affecting recovery */
  factors: RecoveryFactor[];
  /** Current severity level */
  currentSeverity: 'normal' | 'degraded' | 'severely_degraded' | 'unusable';
  /** Recovery phases */
  phases: RecoveryPhase[];
}

export interface RecoveryFactor {
  name: string;
  status: 'improving' | 'stable' | 'worsening';
  impact: string;
}

export interface RecoveryPhase {
  label: string;
  hoursFromNow: number;
  expectedCondition: string;
}

/**
 * Estimate GNSS recovery time based on current conditions
 */
export function estimateGnssRecovery(
  kp: number,
  kpTrend: 'rising' | 'stable' | 'falling',
  tec: number,
  localHour: number,
  latitude: number,
  kpForecast?: { kp: number; time: string }[]
): GnssRecoveryEstimate {
  // Determine current severity
  const currentSeverity = assessCurrentSeverity(kp, tec);

  // If conditions are already normal, return immediately
  if (currentSeverity === 'normal') {
    return {
      hoursToRecovery: 0,
      confidence: 'high',
      description: 'GNSS conditions are currently normal.',
      factors: [],
      currentSeverity: 'normal',
      phases: [],
    };
  }

  const factors: RecoveryFactor[] = [];

  // Factor 1: Kp decay
  let kpRecoveryHours = estimateKpDecayTime(kp, kpTrend, kpForecast);
  factors.push({
    name: 'Geomagnetic Activity',
    status: kpTrend === 'falling' ? 'improving' : kpTrend === 'rising' ? 'worsening' : 'stable',
    impact: kp >= 5
      ? `Kp ${kp.toFixed(0)} causing ionospheric disturbances`
      : `Kp ${kp.toFixed(0)} with moderate impact`,
  });

  // Factor 2: TEC recovery
  let tecRecoveryHours = estimateTecRecoveryTime(tec, localHour);
  factors.push({
    name: 'Ionospheric TEC',
    status: localHour >= 18 || localHour <= 6 ? 'improving' : 'stable',
    impact: tec >= 60
      ? `High TEC (${tec} TECU) causing significant delays`
      : tec >= 30
      ? `Elevated TEC (${tec} TECU) affecting single-frequency`
      : `Normal TEC levels`,
  });

  // Factor 3: Latitude-specific considerations
  const absLat = Math.abs(latitude);
  let latitudeModifier = 1.0;

  if (absLat >= 55) {
    // High latitude - auroral effects persist longer during storms
    latitudeModifier = kp >= 5 ? 1.5 : 1.2;
    factors.push({
      name: 'High-Latitude Effects',
      status: kp >= 5 ? 'worsening' : 'stable',
      impact: 'Auroral zone irregularities may persist',
    });
  } else if (absLat <= 25) {
    // Equatorial - evening irregularities
    const isEvening = localHour >= 18 || localHour <= 2;
    if (isEvening) {
      latitudeModifier = 1.3;
      factors.push({
        name: 'Equatorial Irregularities',
        status: localHour >= 22 || localHour <= 2 ? 'improving' : 'worsening',
        impact: 'Post-sunset equatorial plasma bubbles',
      });
    }
  }

  // Calculate total recovery time
  const baseRecoveryHours = Math.max(kpRecoveryHours, tecRecoveryHours);
  const hoursToRecovery = Math.round(baseRecoveryHours * latitudeModifier * 10) / 10;

  // Determine confidence
  const confidence = determineConfidence(kpTrend, kpForecast !== undefined);

  // Build recovery phases
  const phases = buildRecoveryPhases(hoursToRecovery, currentSeverity, kp, tec);

  // Build description
  const description = buildDescription(hoursToRecovery, currentSeverity, kpTrend, kp);

  return {
    hoursToRecovery,
    confidence,
    description,
    factors,
    currentSeverity,
    phases,
  };
}

function assessCurrentSeverity(kp: number, tec: number): GnssRecoveryEstimate['currentSeverity'] {
  // Both high Kp and TEC contribute to severity
  const kpScore = kp >= 7 ? 3 : kp >= 5 ? 2 : kp >= 4 ? 1 : 0;
  const tecScore = tec >= 100 ? 3 : tec >= 60 ? 2 : tec >= 30 ? 1 : 0;

  const totalScore = kpScore + tecScore;

  if (totalScore >= 5) return 'unusable';
  if (totalScore >= 3) return 'severely_degraded';
  if (totalScore >= 1) return 'degraded';
  return 'normal';
}

function estimateKpDecayTime(
  kp: number,
  trend: 'rising' | 'stable' | 'falling',
  forecast?: { kp: number; time: string }[]
): number {
  // If we have forecast data, use it to estimate when Kp drops below 4
  if (forecast && forecast.length > 0) {
    const now = new Date();
    for (const point of forecast) {
      const pointTime = new Date(point.time);
      if (point.kp < 4 && pointTime > now) {
        const hours = (pointTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return Math.max(0, hours);
      }
    }
  }

  // Without forecast, estimate based on typical decay patterns
  // Kp typically decays 1-2 points per 3-hour period after storm peak
  if (kp < 4) return 0;

  const pointsToDecay = kp - 3.5;
  const decayRatePerHour = trend === 'falling' ? 0.5 : trend === 'stable' ? 0.3 : 0.1;

  return pointsToDecay / decayRatePerHour;
}

function estimateTecRecoveryTime(tec: number, localHour: number): number {
  if (tec < 30) return 0;

  // TEC typically peaks in afternoon (14:00-16:00 local) and decays at night
  // Recovery is faster during nighttime (after 20:00)
  const isNighttime = localHour >= 20 || localHour <= 6;
  const isMorning = localHour >= 6 && localHour <= 10;

  // Base recovery rate: TEC drops ~10 TECU/hour at night, ~3 TECU/hour during day
  const decayRate = isNighttime ? 10 : isMorning ? 5 : 3;
  const tecToRecover = tec - 25; // Target is 25 TECU (normal level)

  let hours = tecToRecover / decayRate;

  // If it's afternoon and TEC is still building, add time for peak
  if (localHour >= 12 && localHour <= 16) {
    hours += 20 - localHour; // Hours until nighttime decay begins
  }

  return Math.max(0, hours);
}

function determineConfidence(
  kpTrend: 'rising' | 'stable' | 'falling',
  hasForecast: boolean
): 'high' | 'moderate' | 'low' {
  if (hasForecast && kpTrend === 'falling') return 'high';
  if (hasForecast || kpTrend === 'falling') return 'moderate';
  return 'low';
}

function buildRecoveryPhases(
  totalHours: number,
  currentSeverity: GnssRecoveryEstimate['currentSeverity'],
  kp: number,
  tec: number
): RecoveryPhase[] {
  const phases: RecoveryPhase[] = [];

  if (totalHours <= 0) return phases;

  if (currentSeverity === 'unusable' || currentSeverity === 'severely_degraded') {
    phases.push({
      label: 'Severe Degradation',
      hoursFromNow: 0,
      expectedCondition: 'Avoid precision work. High error rates expected.',
    });

    if (totalHours > 2) {
      phases.push({
        label: 'Improving',
        hoursFromNow: Math.round(totalHours * 0.4),
        expectedCondition: 'Conditions beginning to stabilize. Monitor closely.',
      });
    }
  }

  if (totalHours > 1) {
    phases.push({
      label: 'Degraded',
      hoursFromNow: Math.round(totalHours * 0.6),
      expectedCondition: 'RTK/PPP may be usable with increased convergence time.',
    });
  }

  phases.push({
    label: 'Normal',
    hoursFromNow: Math.round(totalHours),
    expectedCondition: 'Full precision operations can resume.',
  });

  return phases;
}

function buildDescription(
  hours: number,
  severity: GnssRecoveryEstimate['currentSeverity'],
  trend: 'rising' | 'stable' | 'falling',
  kp: number
): string {
  if (hours === 0) {
    return 'GNSS conditions are currently suitable for precision operations.';
  }

  const timeStr =
    hours < 1
      ? 'less than an hour'
      : hours < 2
      ? 'about an hour'
      : hours < 24
      ? `approximately ${Math.round(hours)} hours`
      : `about ${Math.round(hours / 24)} day${hours >= 48 ? 's' : ''}`;

  const severityStr =
    severity === 'unusable'
      ? 'Precision GNSS is not recommended'
      : severity === 'severely_degraded'
      ? 'Significant degradation expected'
      : 'Some degradation may occur';

  const trendStr =
    trend === 'falling'
      ? 'Conditions are improving'
      : trend === 'rising'
      ? 'Conditions may worsen before improving'
      : 'Conditions are stable';

  return `${severityStr}. ${trendStr}. Recovery expected in ${timeStr}.`;
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: GnssRecoveryEstimate['currentSeverity']): string {
  switch (severity) {
    case 'unusable':
      return '#dc2626'; // red-600
    case 'severely_degraded':
      return '#f59e0b'; // amber-500
    case 'degraded':
      return '#fbbf24'; // yellow-400
    default:
      return '#22c55e'; // green-500
  }
}

/**
 * Get severity label for UI display
 */
export function getSeverityLabel(severity: GnssRecoveryEstimate['currentSeverity']): string {
  switch (severity) {
    case 'unusable':
      return 'Unusable';
    case 'severely_degraded':
      return 'Severely Degraded';
    case 'degraded':
      return 'Degraded';
    default:
      return 'Normal';
  }
}
