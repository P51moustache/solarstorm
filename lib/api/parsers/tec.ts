// Total Electron Content data structure
export interface TecReading {
  timestamp: string;
  lat: number;
  lng: number;
  tec: number; // TECU (10^16 electrons/m²)
}

export interface TecMapData {
  timestamp: string;
  readings: TecReading[];
  globalMax: number;
  globalMin: number;
  globalMean: number;
}

// Regional TEC summary
export interface RegionalTec {
  regionLabel: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  meanTec: number;
  maxTec: number;
  minTec: number;
  readingCount: number;
  timestamp: string;
}

// TEC condition assessment
export interface TecCondition {
  level: 'normal' | 'elevated' | 'high' | 'extreme';
  description: string;
  gnssImpact: string;
  color: string;
}

// SWPC provides TEC data in various formats
// Using the JSON endpoint for US TEC
interface SwpcTecData {
  time_tag: string;
  lat: number;
  lon: number;
  tec: number;
}

export function parseTecData(data: unknown): TecReading[] {
  if (!Array.isArray(data)) return [];

  const readings: TecReading[] = [];

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as SwpcTecData;

    if (entry.lat === undefined || entry.lon === undefined || entry.tec === undefined) {
      continue;
    }

    readings.push({
      timestamp: entry.time_tag || new Date().toISOString(),
      lat: entry.lat,
      lng: entry.lon,
      tec: entry.tec,
    });
  }

  return readings;
}

export function calculateTecMapStats(readings: TecReading[]): TecMapData {
  if (readings.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      readings: [],
      globalMax: 0,
      globalMin: 0,
      globalMean: 0,
    };
  }

  const tecValues = readings.map((r) => r.tec);
  const globalMax = Math.max(...tecValues);
  const globalMin = Math.min(...tecValues);
  const globalMean = tecValues.reduce((a, b) => a + b, 0) / tecValues.length;

  return {
    timestamp: readings[0]?.timestamp || new Date().toISOString(),
    readings,
    globalMax,
    globalMin,
    globalMean: Math.round(globalMean * 10) / 10,
  };
}

export function calculateRegionalTec(
  readings: TecReading[],
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  regionLabel: string
): RegionalTec {
  // Filter readings within radius using Haversine approximation
  const withinRadius = readings.filter((r) => {
    const dLat = (r.lat - centerLat) * (Math.PI / 180);
    const dLng = (r.lng - centerLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(centerLat * (Math.PI / 180)) *
        Math.cos(r.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = 6371 * c; // Earth radius in km
    return distKm <= radiusKm;
  });

  if (withinRadius.length === 0) {
    return {
      regionLabel,
      centerLat,
      centerLng,
      radiusKm,
      meanTec: 0,
      maxTec: 0,
      minTec: 0,
      readingCount: 0,
      timestamp: readings[0]?.timestamp || new Date().toISOString(),
    };
  }

  const tecValues = withinRadius.map((r) => r.tec);
  return {
    regionLabel,
    centerLat,
    centerLng,
    radiusKm,
    meanTec: Math.round((tecValues.reduce((a, b) => a + b, 0) / tecValues.length) * 10) / 10,
    maxTec: Math.max(...tecValues),
    minTec: Math.min(...tecValues),
    readingCount: withinRadius.length,
    timestamp: withinRadius[0].timestamp,
  };
}

// Assess TEC condition for GNSS impact
export function getTecCondition(tec: number): TecCondition {
  if (tec >= 100) {
    return {
      level: 'extreme',
      description: 'Extreme TEC',
      gnssImpact: 'Severe positioning errors likely. RTK/PPP operations should pause. Consider post-processing with correction data.',
      color: '#dc2626',
    };
  } else if (tec >= 60) {
    return {
      level: 'high',
      description: 'High TEC',
      gnssImpact: 'Significant ranging errors expected. RTK fix may be difficult to maintain. Monitor convergence times.',
      color: '#f59e0b',
    };
  } else if (tec >= 30) {
    return {
      level: 'elevated',
      description: 'Elevated TEC',
      gnssImpact: 'Moderate ionospheric delay. Dual-frequency receivers recommended. Single-frequency users may see degradation.',
      color: '#fbbf24',
    };
  }

  return {
    level: 'normal',
    description: 'Normal TEC',
    gnssImpact: 'Standard ionospheric conditions. Normal GNSS operations.',
    color: '#22c55e',
  };
}

// Estimate positioning error from TEC (simplified model)
export function estimatePositionError(tec: number, isDualFrequency: boolean): {
  horizontalM: number;
  verticalM: number;
  description: string;
} {
  // Single frequency: ~0.3m error per 10 TECU
  // Dual frequency: ~0.01m error per 10 TECU (iono-free combination)
  const errorPerTecu = isDualFrequency ? 0.001 : 0.03;
  const baseError = isDualFrequency ? 0.02 : 0.5; // Baseline error in meters

  const horizontalM = Math.round((baseError + tec * errorPerTecu) * 100) / 100;
  const verticalM = Math.round(horizontalM * 2 * 100) / 100; // Vertical typically 2x horizontal

  let description: string;
  if (horizontalM < 0.1) {
    description = 'cm-level positioning achievable';
  } else if (horizontalM < 0.5) {
    description = 'Sub-meter positioning expected';
  } else if (horizontalM < 2) {
    description = 'Meter-level positioning';
  } else {
    description = 'Multi-meter errors possible';
  }

  return { horizontalM, verticalM, description };
}
