import type { GnssConstellation } from '../../supabase/types';

export interface ConstellationHealth {
  constellation: GnssConstellation;
  healthyCount: number;
  unhealthyCount: number;
  degradedCount: number;
  totalCount: number;
  healthPercentage: number;
  status: 'operational' | 'degraded' | 'impaired' | 'critical';
  statusColor: string;
  notes: string | null;
  updatedAt: string;
}

export interface AllConstellationsStatus {
  gps: ConstellationHealth;
  glonass: ConstellationHealth;
  galileo: ConstellationHealth;
  beidou: ConstellationHealth;
  overallStatus: 'operational' | 'degraded' | 'impaired';
  updatedAt: string;
}

// Nominal constellation sizes
const NOMINAL_SIZES: Record<GnssConstellation, number> = {
  GPS: 31,
  GLONASS: 24,
  Galileo: 30,
  BeiDou: 45,
};

export function calculateConstellationHealth(
  constellation: GnssConstellation,
  healthy: number,
  unhealthy: number,
  degraded: number = 0,
  notes: string | null = null
): ConstellationHealth {
  const total = healthy + unhealthy + degraded;
  const nominal = NOMINAL_SIZES[constellation];
  const healthPercentage = total > 0 ? Math.round((healthy / total) * 100) : 0;

  let status: ConstellationHealth['status'];
  let statusColor: string;

  if (healthPercentage >= 90 && healthy >= nominal * 0.75) {
    status = 'operational';
    statusColor = '#22c55e';
  } else if (healthPercentage >= 75 && healthy >= nominal * 0.6) {
    status = 'degraded';
    statusColor = '#fbbf24';
  } else if (healthPercentage >= 50) {
    status = 'impaired';
    statusColor = '#f59e0b';
  } else {
    status = 'critical';
    statusColor = '#dc2626';
  }

  return {
    constellation,
    healthyCount: healthy,
    unhealthyCount: unhealthy,
    degradedCount: degraded,
    totalCount: total,
    healthPercentage,
    status,
    statusColor,
    notes,
    updatedAt: new Date().toISOString(),
  };
}

export function assessOverallGnssStatus(
  statuses: ConstellationHealth[]
): 'operational' | 'degraded' | 'impaired' {
  const criticalCount = statuses.filter((s) => s.status === 'critical').length;
  const impairedCount = statuses.filter((s) => s.status === 'impaired').length;
  const degradedCount = statuses.filter((s) => s.status === 'degraded').length;

  if (criticalCount > 0 || impairedCount >= 2) {
    return 'impaired';
  } else if (impairedCount > 0 || degradedCount >= 2) {
    return 'degraded';
  }
  return 'operational';
}

// Impact assessment for multi-constellation users
export function getMultiConstellationImpact(status: AllConstellationsStatus): {
  recommendation: string;
  availableSvs: number;
  geometryImpact: 'none' | 'minor' | 'moderate' | 'significant';
} {
  const totalHealthy =
    status.gps.healthyCount +
    status.glonass.healthyCount +
    status.galileo.healthyCount +
    status.beidou.healthyCount;

  let geometryImpact: 'none' | 'minor' | 'moderate' | 'significant';
  let recommendation: string;

  if (totalHealthy >= 80) {
    geometryImpact = 'none';
    recommendation = 'Excellent multi-constellation coverage. All precision operations supported.';
  } else if (totalHealthy >= 60) {
    geometryImpact = 'minor';
    recommendation = 'Good coverage. Slight geometry degradation possible in challenging environments.';
  } else if (totalHealthy >= 40) {
    geometryImpact = 'moderate';
    recommendation = 'Reduced coverage. Consider single-constellation fallback in areas with good sky view.';
  } else {
    geometryImpact = 'significant';
    recommendation = 'Limited coverage. Precision operations may be affected. Check local satellite availability.';
  }

  return {
    recommendation,
    availableSvs: totalHealthy,
    geometryImpact,
  };
}
