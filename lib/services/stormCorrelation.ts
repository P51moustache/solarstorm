import { supabase } from '@/lib/supabase/client';
import type { SatelliteAnomaly } from '@/lib/supabase/types';

export interface StormEvent {
  startTime: Date;
  peakTime: Date;
  endTime: Date;
  peakKp: number;
  peakProtonFlux: number;
  classification: string; // G1-G5 or S1-S5
}

export interface CorrelationResult {
  stormEvent: StormEvent;
  anomalies: SatelliteAnomaly[];
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'none';
  delayHours: number; // Average delay from storm peak to anomaly
  color: string;
}

export async function findAnomaliesInTimeRange(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<SatelliteAnomaly[]> {
  const { data, error } = await supabase
    .from('satellite_anomalies')
    .select('*')
    .eq('user_id', userId)
    .gte('occurred_at', startTime.toISOString())
    .lte('occurred_at', endTime.toISOString())
    .order('occurred_at', { ascending: true });

  if (error) throw error;
  return (data || []) as SatelliteAnomaly[];
}

export function correlateAnomaliesWithStorm(
  storm: StormEvent,
  anomalies: SatelliteAnomaly[]
): CorrelationResult {
  // Look for anomalies within 48 hours of storm peak
  const windowStart = new Date(storm.peakTime.getTime() - 6 * 60 * 60 * 1000);
  const windowEnd = new Date(storm.peakTime.getTime() + 48 * 60 * 60 * 1000);

  const correlatedAnomalies = anomalies.filter(a => {
    const time = new Date(a.occurred_at);
    return time >= windowStart && time <= windowEnd;
  });

  // Calculate average delay from storm peak
  let totalDelay = 0;
  for (const anomaly of correlatedAnomalies) {
    const anomalyTime = new Date(anomaly.occurred_at).getTime();
    const peakTime = storm.peakTime.getTime();
    totalDelay += (anomalyTime - peakTime) / (1000 * 60 * 60);
  }
  const avgDelay = correlatedAnomalies.length > 0
    ? totalDelay / correlatedAnomalies.length
    : 0;

  // Determine correlation strength
  let strength: CorrelationResult['correlationStrength'];
  let color: string;
  const ratio = correlatedAnomalies.length / Math.max(anomalies.length, 1);

  if (correlatedAnomalies.length >= 3 && ratio > 0.5) {
    strength = 'strong';
    color = '#dc2626';
  } else if (correlatedAnomalies.length >= 2 && ratio > 0.3) {
    strength = 'moderate';
    color = '#f59e0b';
  } else if (correlatedAnomalies.length >= 1) {
    strength = 'weak';
    color = '#fbbf24';
  } else {
    strength = 'none';
    color = '#22c55e';
  }

  return {
    stormEvent: storm,
    anomalies: correlatedAnomalies,
    correlationStrength: strength,
    delayHours: Math.round(avgDelay * 10) / 10,
    color,
  };
}

// Classify proton storm by S-scale
export function classifyProtonStorm(flux: number): string {
  if (flux >= 100000) return 'S5';
  if (flux >= 10000) return 'S4';
  if (flux >= 1000) return 'S3';
  if (flux >= 100) return 'S2';
  if (flux >= 10) return 'S1';
  return 'S0';
}

// Classify geomagnetic storm by G-scale
export function classifyGeomagneticStorm(kp: number): string {
  if (kp >= 9) return 'G5';
  if (kp >= 8) return 'G4';
  if (kp >= 7) return 'G3';
  if (kp >= 6) return 'G2';
  if (kp >= 5) return 'G1';
  return 'G0';
}

// Analyze anomaly patterns for a fleet
export interface AnomalyPattern {
  type: string;
  count: number;
  avgKpAtTime: number | null;
  avgProtonFluxAtTime: number | null;
  mostCommonSeverity: string;
}

export function analyzeAnomalyPatterns(anomalies: SatelliteAnomaly[]): AnomalyPattern[] {
  const byType: Record<string, SatelliteAnomaly[]> = {};

  for (const anomaly of anomalies) {
    const type = anomaly.anomaly_type;
    if (!byType[type]) byType[type] = [];
    byType[type].push(anomaly);
  }

  return Object.entries(byType).map(([type, typeAnomalies]) => {
    // Calculate averages
    const kpValues = typeAnomalies
      .filter(a => a.kp_at_time !== null)
      .map(a => a.kp_at_time!);
    const avgKp = kpValues.length > 0
      ? kpValues.reduce((a, b) => a + b, 0) / kpValues.length
      : null;

    const protonValues = typeAnomalies
      .filter(a => a.proton_flux_at_time !== null)
      .map(a => a.proton_flux_at_time!);
    const avgProton = protonValues.length > 0
      ? protonValues.reduce((a, b) => a + b, 0) / protonValues.length
      : null;

    // Find most common severity
    const severityCounts: Record<string, number> = {};
    for (const a of typeAnomalies) {
      severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
    }
    const mostCommonSeverity = Object.entries(severityCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    return {
      type,
      count: typeAnomalies.length,
      avgKpAtTime: avgKp !== null ? Math.round(avgKp * 10) / 10 : null,
      avgProtonFluxAtTime: avgProton,
      mostCommonSeverity,
    };
  }).sort((a, b) => b.count - a.count);
}

// Get correlation strength description
export function getCorrelationDescription(strength: CorrelationResult['correlationStrength']): string {
  switch (strength) {
    case 'strong':
      return 'Strong correlation - anomalies closely follow storm events';
    case 'moderate':
      return 'Moderate correlation - some anomalies may be storm-related';
    case 'weak':
      return 'Weak correlation - limited evidence of storm impact';
    case 'none':
      return 'No correlation - anomalies not associated with this storm';
  }
}
