import { assessRadiationBeltRisk } from './radiationBelt';

export interface LaunchWindowAssessment {
  overall: 'go' | 'caution' | 'no-go';
  factors: {
    name: string;
    status: 'green' | 'yellow' | 'red';
    value: string;
    threshold: string;
  }[];
  orbitRaisingRisk: string;
  recommendations: string[];
  color: string;
}

export function assessLaunchWindow(
  targetAltitude: number,
  kp: number,
  protonFlux: number,
  electronFlux: number,
  solarWindSpeed: number
): LaunchWindowAssessment {
  const factors: LaunchWindowAssessment['factors'] = [];
  const recommendations: string[] = [];

  // Kp index assessment
  let kpStatus: 'green' | 'yellow' | 'red' = 'green';
  if (kp >= 7) kpStatus = 'red';
  else if (kp >= 5) kpStatus = 'yellow';
  factors.push({
    name: 'Geomagnetic Activity (Kp)',
    status: kpStatus,
    value: kp.toFixed(1),
    threshold: '< 5 green, < 7 yellow',
  });

  // Proton flux (SPE) assessment
  let protonStatus: 'green' | 'yellow' | 'red' = 'green';
  if (protonFlux >= 100) protonStatus = 'red';
  else if (protonFlux >= 10) protonStatus = 'yellow';
  factors.push({
    name: 'Solar Proton Event',
    status: protonStatus,
    value: `${protonFlux.toExponential(1)} pfu`,
    threshold: '< 10 green, < 100 yellow',
  });

  // Solar wind assessment
  let windStatus: 'green' | 'yellow' | 'red' = 'green';
  if (solarWindSpeed >= 700) windStatus = 'red';
  else if (solarWindSpeed >= 500) windStatus = 'yellow';
  factors.push({
    name: 'Solar Wind Speed',
    status: windStatus,
    value: `${Math.round(solarWindSpeed)} km/s`,
    threshold: '< 500 green, < 700 yellow',
  });

  // Orbit raising risk
  let orbitRaisingRisk = 'Low';
  if (targetAltitude > 1000) {
    const radiationRisk = assessRadiationBeltRisk(
      targetAltitude,
      protonFlux,
      electronFlux,
      kp
    );
    if (radiationRisk.level === 'severe') {
      orbitRaisingRisk = 'Severe - delay recommended';
      recommendations.push('High radiation environment for orbit raising');
    } else if (radiationRisk.level === 'high') {
      orbitRaisingRisk = 'High - proceed with caution';
      recommendations.push('Elevated radiation during orbit raising phase');
    } else if (radiationRisk.level === 'moderate') {
      orbitRaisingRisk = 'Moderate';
    }
  }

  // LEO drag during orbit raising
  if (targetAltitude < 600 && kp >= 5) {
    recommendations.push('Elevated atmospheric drag - may affect orbit raising fuel budget');
  }

  // Add positive recommendations
  if (kp <= 2 && protonFlux < 10 && solarWindSpeed < 400) {
    recommendations.push('Excellent space weather conditions for launch');
  }

  // Overall assessment
  const hasRed = factors.some(f => f.status === 'red');
  const hasYellow = factors.some(f => f.status === 'yellow');

  let overall: LaunchWindowAssessment['overall'];
  let color: string;
  if (hasRed) {
    overall = 'no-go';
    color = '#dc2626';
    recommendations.unshift('Launch conditions unfavorable - recommend delay');
  } else if (hasYellow) {
    overall = 'caution';
    color = '#f59e0b';
    recommendations.unshift('Launch possible with increased monitoring');
  } else {
    overall = 'go';
    color = '#22c55e';
    if (recommendations.length === 0) {
      recommendations.push('All factors nominal for launch');
    }
  }

  return { overall, factors, orbitRaisingRisk, recommendations, color };
}

// Get status color for display
export function getStatusColor(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green': return '#22c55e';
    case 'yellow': return '#f59e0b';
    case 'red': return '#dc2626';
  }
}

// Get overall status label
export function getOverallLabel(overall: LaunchWindowAssessment['overall']): string {
  switch (overall) {
    case 'go': return 'GO';
    case 'caution': return 'CAUTION';
    case 'no-go': return 'NO-GO';
  }
}
