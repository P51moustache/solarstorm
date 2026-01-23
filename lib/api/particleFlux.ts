import { fetchJson } from './fetchJson';
import {
  parseProtonFluxData,
  parseElectronFluxData,
  getSolarRadiationScale,
  getSurfaceChargingRisk,
  type ProtonFluxReading,
  type ElectronFluxReading,
  type SScaleLevel,
} from './parsers/particleFlux';

// SWPC endpoints
const PROTON_FLUX_URL = 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json';
const ELECTRON_FLUX_URL = 'https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-1-day.json';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let protonCache: { data: ProtonFluxReading[]; timestamp: number } | null = null;
let electronCache: { data: ElectronFluxReading[]; timestamp: number } | null = null;

export async function getProtonFlux(): Promise<ProtonFluxReading[]> {
  const now = Date.now();
  if (protonCache && now - protonCache.timestamp < CACHE_TTL) {
    return protonCache.data;
  }

  try {
    const data = await fetchJson(PROTON_FLUX_URL);
    const readings = parseProtonFluxData(data);
    protonCache = { data: readings, timestamp: now };
    return readings;
  } catch (error) {
    console.error('Failed to fetch proton flux:', error);
    return protonCache?.data || [];
  }
}

export async function getElectronFlux(): Promise<ElectronFluxReading[]> {
  const now = Date.now();
  if (electronCache && now - electronCache.timestamp < CACHE_TTL) {
    return electronCache.data;
  }

  try {
    const data = await fetchJson(ELECTRON_FLUX_URL);
    const readings = parseElectronFluxData(data);
    electronCache = { data: readings, timestamp: now };
    return readings;
  } catch (error) {
    console.error('Failed to fetch electron flux:', error);
    return electronCache?.data || [];
  }
}

export interface ParticleFluxStatus {
  proton: {
    latest: ProtonFluxReading | null;
    sScale: SScaleLevel;
  };
  electron: {
    latest: ElectronFluxReading | null;
    chargingRisk: ReturnType<typeof getSurfaceChargingRisk>;
  };
  updatedAt: string;
}

export async function getParticleFluxStatus(): Promise<ParticleFluxStatus> {
  const [protons, electrons] = await Promise.all([
    getProtonFlux(),
    getElectronFlux(),
  ]);

  const latestProton = protons.length > 0 ? protons[protons.length - 1] : null;
  const latestElectron = electrons.length > 0 ? electrons[electrons.length - 1] : null;

  return {
    proton: {
      latest: latestProton,
      sScale: getSolarRadiationScale(latestProton?.flux_10mev ?? 0),
    },
    electron: {
      latest: latestElectron,
      chargingRisk: getSurfaceChargingRisk(latestElectron?.flux_2mev ?? 0),
    },
    updatedAt: latestProton?.timestamp || latestElectron?.timestamp || new Date().toISOString(),
  };
}

// Re-export types for convenience
export type { ProtonFluxReading, ElectronFluxReading, SScale, SScaleLevel } from './parsers/particleFlux';
export { getSolarRadiationScale, getSurfaceChargingRisk } from './parsers/particleFlux';
