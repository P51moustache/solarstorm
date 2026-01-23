// GOES Proton Flux data structure
export interface ProtonFluxReading {
  timestamp: string;
  flux_10mev: number | null; // >10 MeV protons (pfu)
  flux_50mev: number | null; // >50 MeV protons (pfu)
  flux_100mev: number | null; // >100 MeV protons (pfu)
}

// GOES Electron Flux data structure
export interface ElectronFluxReading {
  timestamp: string;
  flux_08mev: number | null; // >0.8 MeV electrons
  flux_2mev: number | null; // >2 MeV electrons
}

// S-scale for solar radiation storms (proton events)
export type SScale = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export interface SScaleLevel {
  scale: SScale;
  description: string;
  impact: string;
  color: string;
}

// SWPC JSON format for integral proton flux
interface SwpcProtonData {
  time_tag: string;
  flux: number;
  energy: string; // ">=10 MeV", ">=50 MeV", ">=100 MeV"
}

// SWPC JSON format for electron flux
interface SwpcElectronData {
  time_tag: string;
  flux: number;
  energy: string; // ">=0.8 MeV", ">=2 MeV"
}

export function parseProtonFluxData(data: unknown): ProtonFluxReading[] {
  if (!Array.isArray(data)) return [];

  const readings: Map<string, ProtonFluxReading> = new Map();

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as SwpcProtonData;

    const timestamp = entry.time_tag;
    if (!timestamp) continue;

    let reading = readings.get(timestamp);
    if (!reading) {
      reading = {
        timestamp,
        flux_10mev: null,
        flux_50mev: null,
        flux_100mev: null,
      };
      readings.set(timestamp, reading);
    }

    const flux = parseFloat(String(entry.flux));
    if (isNaN(flux)) continue;

    if (entry.energy?.includes('10')) {
      reading.flux_10mev = flux;
    } else if (entry.energy?.includes('50')) {
      reading.flux_50mev = flux;
    } else if (entry.energy?.includes('100')) {
      reading.flux_100mev = flux;
    }
  }

  return Array.from(readings.values())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function parseElectronFluxData(data: unknown): ElectronFluxReading[] {
  if (!Array.isArray(data)) return [];

  const readings: Map<string, ElectronFluxReading> = new Map();

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as SwpcElectronData;

    const timestamp = entry.time_tag;
    if (!timestamp) continue;

    let reading = readings.get(timestamp);
    if (!reading) {
      reading = {
        timestamp,
        flux_08mev: null,
        flux_2mev: null,
      };
      readings.set(timestamp, reading);
    }

    const flux = parseFloat(String(entry.flux));
    if (isNaN(flux)) continue;

    if (entry.energy?.includes('0.8')) {
      reading.flux_08mev = flux;
    } else if (entry.energy?.includes('2')) {
      reading.flux_2mev = flux;
    }
  }

  return Array.from(readings.values())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// S-scale based on >10 MeV proton flux (pfu)
export function getSolarRadiationScale(flux10mev: number): SScaleLevel {
  if (flux10mev >= 100000) {
    return {
      scale: 'S5',
      description: 'Extreme',
      impact: 'Unavoidable satellite damage, complete HF blackout polar regions',
      color: '#dc2626',
    };
  } else if (flux10mev >= 10000) {
    return {
      scale: 'S4',
      description: 'Severe',
      impact: 'Satellite memory/imaging issues, elevated radiation for polar flights',
      color: '#ea580c',
    };
  } else if (flux10mev >= 1000) {
    return {
      scale: 'S3',
      description: 'Strong',
      impact: 'Single-event upsets in satellites, HF degradation polar regions',
      color: '#f59e0b',
    };
  } else if (flux10mev >= 100) {
    return {
      scale: 'S2',
      description: 'Moderate',
      impact: 'Infrequent satellite single-event upsets, small radiation effects',
      color: '#fbbf24',
    };
  } else if (flux10mev >= 10) {
    return {
      scale: 'S1',
      description: 'Minor',
      impact: 'Minor satellite effects possible',
      color: '#84cc16',
    };
  }

  return {
    scale: 'S0',
    description: 'None',
    impact: 'No significant radiation storm',
    color: '#22c55e',
  };
}

// Surface charging risk for GEO satellites based on >2 MeV electron flux
export function getSurfaceChargingRisk(flux2mev: number): {
  level: 'low' | 'moderate' | 'high' | 'severe';
  description: string;
  color: string;
} {
  if (flux2mev >= 10000) {
    return {
      level: 'severe',
      description: 'Severe charging risk - consider safe mode for GEO assets',
      color: '#dc2626',
    };
  } else if (flux2mev >= 1000) {
    return {
      level: 'high',
      description: 'High charging risk - monitor GEO satellite telemetry closely',
      color: '#f59e0b',
    };
  } else if (flux2mev >= 100) {
    return {
      level: 'moderate',
      description: 'Moderate charging - normal operations with awareness',
      color: '#fbbf24',
    };
  }

  return {
    level: 'low',
    description: 'Low charging risk - normal operations',
    color: '#22c55e',
  };
}
