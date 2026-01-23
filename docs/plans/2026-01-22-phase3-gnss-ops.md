# Phase 3: GNSS Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build GNSS-focused features for Pro tier ($49/month) - ionospheric monitoring, scintillation forecasts, multi-constellation status, and precision positioning degradation alerts for GNSS/surveying professionals.

**Architecture:** Supabase for region storage and alert configs, NOAA SWPC APIs for TEC and scintillation data, IGS/MGEX for constellation status, Edge Functions for regional calculations. All GNSS features are Pro-tier gated.

**Tech Stack:** Supabase (Postgres, Edge Functions), NOAA SWPC APIs, IGS MGEX data, Zustand state, existing feature gating from Phase 1

**Prerequisites:** Phase 1 (foundation with GNSS tables) and Phase 2 (satellite ops patterns) must be complete

---

## Task 1: Create TEC Data Pipeline

**Files:**
- Create: `lib/api/parsers/tec.ts`
- Create: `lib/api/tec.ts`

**Step 1: Create TEC parser**

Create `lib/api/parsers/tec.ts`:
```typescript
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

export function calculateTecMapStats(readings: TecReading[]): Omit<TecMapData, 'readings'> & { readings: TecReading[] } {
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
```

**Step 2: Create TEC API functions**

Create `lib/api/tec.ts`:
```typescript
import { fetchJson } from './fetchJson';
import {
  parseTecData,
  calculateTecMapStats,
  calculateRegionalTec,
  getTecCondition,
  type TecMapData,
  type RegionalTec,
  type TecCondition,
} from './parsers/tec';

// SWPC TEC data endpoint (US coverage)
const TEC_URL = 'https://services.swpc.noaa.gov/json/us_tec.json';

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes (matches update frequency)
let tecCache: { data: TecMapData; timestamp: number } | null = null;

export async function getTecMap(): Promise<TecMapData> {
  const now = Date.now();
  if (tecCache && now - tecCache.timestamp < CACHE_TTL) {
    return tecCache.data;
  }

  try {
    const data = await fetchJson(TEC_URL);
    const readings = parseTecData(data);
    const mapData = calculateTecMapStats(readings);
    tecCache = { data: mapData, timestamp: now };
    return mapData;
  } catch (error) {
    console.error('Failed to fetch TEC data:', error);
    if (tecCache) return tecCache.data;
    throw error;
  }
}

export async function getRegionalTec(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  regionLabel: string
): Promise<RegionalTec> {
  const mapData = await getTecMap();
  return calculateRegionalTec(mapData.readings, centerLat, centerLng, radiusKm, regionLabel);
}

export interface TecStatus {
  global: {
    mean: number;
    max: number;
    condition: TecCondition;
  };
  regions: RegionalTec[];
  updatedAt: string;
}

export async function getTecStatus(
  regions: Array<{ lat: number; lng: number; radiusKm: number; label: string }>
): Promise<TecStatus> {
  const mapData = await getTecMap();

  const regionalData = regions.map((r) =>
    calculateRegionalTec(mapData.readings, r.lat, r.lng, r.radiusKm, r.label)
  );

  return {
    global: {
      mean: mapData.globalMean,
      max: mapData.globalMax,
      condition: getTecCondition(mapData.globalMean),
    },
    regions: regionalData,
    updatedAt: mapData.timestamp,
  };
}
```

**Step 3: Commit**

```bash
git add lib/api/parsers/tec.ts lib/api/tec.ts
git commit -m "feat: add TEC data pipeline for GNSS ionospheric monitoring"
```

---

## Task 2: Create Scintillation Data Pipeline

**Files:**
- Create: `lib/api/parsers/scintillation.ts`
- Create: `lib/api/scintillation.ts`

**Step 1: Create scintillation parser**

Create `lib/api/parsers/scintillation.ts`:
```typescript
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
    const isEquinox = month >= 2 && month <= 4 || month >= 8 && month <= 10;
    const isPostSunset = localHour >= 19 || localHour <= 1;

    if (isPostSunset) {
      equatorialRisk = isEquinox ? 'strong' : 'moderate';
    } else if (localHour >= 17 && localHour <= 3) {
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
```

**Step 2: Create scintillation API**

Create `lib/api/scintillation.ts`:
```typescript
import {
  getScintillationSeverity,
  predictScintillationRisk,
  type ScintillationCondition,
  type ScintillationSeverity,
} from './parsers/scintillation';

export interface ScintillationStatus {
  current: ScintillationCondition;
  forecast: {
    equatorialRisk: ScintillationSeverity;
    auroralRisk: ScintillationSeverity;
    description: string;
  };
  updatedAt: string;
}

export async function getScintillationStatus(
  lat: number,
  lng: number,
  kp: number
): Promise<ScintillationStatus> {
  // Get local hour for the location
  const now = new Date();
  const utcHour = now.getUTCHours();
  const lngOffset = Math.round(lng / 15); // Approximate timezone from longitude
  const localHour = (utcHour + lngOffset + 24) % 24;
  const month = now.getMonth() + 1;

  // For now, we don't have real-time scintillation data
  // So we use the forecast based on Kp and location
  const forecast = predictScintillationRisk(kp, lat, localHour, month);

  // Estimate current S4 from the forecast risk
  const riskToS4: Record<ScintillationSeverity, number> = {
    none: 0.05,
    weak: 0.15,
    moderate: 0.4,
    strong: 0.7,
    severe: 1.2,
  };

  const dominantRisk = forecast.auroralRisk !== 'none' ? forecast.auroralRisk : forecast.equatorialRisk;
  const estimatedS4 = riskToS4[dominantRisk];

  return {
    current: getScintillationSeverity(estimatedS4),
    forecast,
    updatedAt: now.toISOString(),
  };
}

// Get scintillation alerts for multiple regions
export async function getScintillationAlerts(
  regions: Array<{ lat: number; lng: number; label: string }>,
  kp: number
): Promise<Array<{ region: string; status: ScintillationStatus }>> {
  const alerts = await Promise.all(
    regions.map(async (region) => ({
      region: region.label,
      status: await getScintillationStatus(region.lat, region.lng, kp),
    }))
  );

  return alerts;
}
```

**Step 3: Commit**

```bash
git add lib/api/parsers/scintillation.ts lib/api/scintillation.ts
git commit -m "feat: add scintillation prediction for GNSS loss-of-lock forecasting"
```

---

## Task 3: Create GNSS Constellation Status Service

**Files:**
- Create: `lib/api/parsers/gnssConstellation.ts`
- Create: `lib/api/gnssConstellation.ts`

**Step 1: Create constellation status parser**

Create `lib/api/parsers/gnssConstellation.ts`:
```typescript
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
```

**Step 2: Create constellation status API**

Create `lib/api/gnssConstellation.ts`:
```typescript
import { supabase } from '../supabase/client';
import {
  calculateConstellationHealth,
  assessOverallGnssStatus,
  getMultiConstellationImpact,
  type AllConstellationsStatus,
  type ConstellationHealth,
} from './parsers/gnssConstellation';
import type { GnssConstellation } from '../supabase/types';

// Fetch latest constellation status from database
// (Populated by background job that monitors IGS/MGEX/NANUs)
export async function getConstellationStatus(): Promise<AllConstellationsStatus> {
  const { data, error } = await supabase
    .from('gnss_constellation_status')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(4);

  if (error) {
    console.error('Failed to fetch constellation status:', error);
    // Return default operational status
    return getDefaultStatus();
  }

  // Group by constellation, take latest for each
  const byConstellation: Partial<Record<GnssConstellation, ConstellationHealth>> = {};

  for (const row of data || []) {
    if (!byConstellation[row.constellation as GnssConstellation]) {
      byConstellation[row.constellation as GnssConstellation] = calculateConstellationHealth(
        row.constellation as GnssConstellation,
        row.healthy_count,
        row.unhealthy_count,
        row.degraded_count,
        row.notes
      );
    }
  }

  // Ensure all constellations have data
  const gps = byConstellation.GPS || getDefaultConstellationHealth('GPS');
  const glonass = byConstellation.GLONASS || getDefaultConstellationHealth('GLONASS');
  const galileo = byConstellation.Galileo || getDefaultConstellationHealth('Galileo');
  const beidou = byConstellation.BeiDou || getDefaultConstellationHealth('BeiDou');

  const statuses = [gps, glonass, galileo, beidou];

  return {
    gps,
    glonass,
    galileo,
    beidou,
    overallStatus: assessOverallGnssStatus(statuses),
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultConstellationHealth(constellation: GnssConstellation): ConstellationHealth {
  // Assume nominal operation if no data
  const nominalHealthy: Record<GnssConstellation, number> = {
    GPS: 31,
    GLONASS: 23,
    Galileo: 28,
    BeiDou: 44,
  };

  return calculateConstellationHealth(constellation, nominalHealthy[constellation], 0, 1);
}

function getDefaultStatus(): AllConstellationsStatus {
  const gps = getDefaultConstellationHealth('GPS');
  const glonass = getDefaultConstellationHealth('GLONASS');
  const galileo = getDefaultConstellationHealth('Galileo');
  const beidou = getDefaultConstellationHealth('BeiDou');

  return {
    gps,
    glonass,
    galileo,
    beidou,
    overallStatus: 'operational',
    updatedAt: new Date().toISOString(),
  };
}

export { getMultiConstellationImpact };
```

**Step 3: Commit**

```bash
git add lib/api/parsers/gnssConstellation.ts lib/api/gnssConstellation.ts
git commit -m "feat: add multi-constellation GNSS status service"
```

---

## Task 4: Create GNSS Store

**Files:**
- Create: `lib/state/useGnssStore.ts`

**Step 1: Create GNSS store**

Create `lib/state/useGnssStore.ts`:
```typescript
import { create } from 'zustand';
import { supabase } from '../supabase/client';
import type { GnssRegion } from '../supabase/types';
import { getTecStatus, type TecStatus } from '../api/tec';
import { getScintillationStatus, type ScintillationStatus } from '../api/scintillation';
import {
  getConstellationStatus,
  getMultiConstellationImpact,
  type AllConstellationsStatus,
} from '../api/gnssConstellation';

interface GnssState {
  // Regions of interest
  regions: GnssRegion[];
  primaryRegion: GnssRegion | null;

  // Status data
  tecStatus: TecStatus | null;
  scintillationStatus: ScintillationStatus | null;
  constellationStatus: AllConstellationsStatus | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRegions: () => Promise<void>;
  addRegion: (region: Omit<GnssRegion, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateRegion: (id: string, updates: Partial<GnssRegion>) => Promise<void>;
  deleteRegion: (id: string) => Promise<void>;
  setPrimaryRegion: (id: string) => Promise<void>;

  // Data refresh
  refreshTec: () => Promise<void>;
  refreshScintillation: (kp: number) => Promise<void>;
  refreshConstellations: () => Promise<void>;
  refreshAll: (kp: number) => Promise<void>;
}

export const useGnssStore = create<GnssState>((set, get) => ({
  regions: [],
  primaryRegion: null,
  tecStatus: null,
  scintillationStatus: null,
  constellationStatus: null,
  isLoading: false,
  error: null,

  fetchRegions: async () => {
    try {
      const { data, error } = await supabase
        .from('gnss_regions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const regions = data || [];
      const primary = regions.find((r) => r.is_primary) || regions[0] || null;

      set({ regions, primaryRegion: primary });
    } catch (error) {
      console.error('Failed to fetch GNSS regions:', error);
    }
  },

  addRegion: async (region) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // If setting as primary, unset existing
      if (region.is_primary) {
        await supabase
          .from('gnss_regions')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .eq('is_primary', true);
      }

      const { error } = await supabase.from('gnss_regions').insert({
        ...region,
        user_id: user.id,
      });

      if (error) throw error;

      await get().fetchRegions();
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add region',
        isLoading: false,
      });
    }
  },

  updateRegion: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('gnss_regions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        regions: state.regions.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      }));
    } catch (error) {
      console.error('Failed to update region:', error);
    }
  },

  deleteRegion: async (id) => {
    try {
      const { error } = await supabase
        .from('gnss_regions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        regions: state.regions.filter((r) => r.id !== id),
        primaryRegion: state.primaryRegion?.id === id ? null : state.primaryRegion,
      }));
    } catch (error) {
      console.error('Failed to delete region:', error);
    }
  },

  setPrimaryRegion: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Unset existing primary
      await supabase
        .from('gnss_regions')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('is_primary', true);

      // Set new primary
      const { error } = await supabase
        .from('gnss_regions')
        .update({ is_primary: true })
        .eq('id', id);

      if (error) throw error;

      await get().fetchRegions();
    } catch (error) {
      console.error('Failed to set primary region:', error);
    }
  },

  refreshTec: async () => {
    const { regions } = get();
    try {
      const regionParams = regions.map((r) => ({
        lat: r.center_lat,
        lng: r.center_lng,
        radiusKm: r.radius_km,
        label: r.label,
      }));

      const status = await getTecStatus(regionParams);
      set({ tecStatus: status });
    } catch (error) {
      console.error('Failed to refresh TEC:', error);
    }
  },

  refreshScintillation: async (kp: number) => {
    const { primaryRegion } = get();
    if (!primaryRegion) return;

    try {
      const status = await getScintillationStatus(
        primaryRegion.center_lat,
        primaryRegion.center_lng,
        kp
      );
      set({ scintillationStatus: status });
    } catch (error) {
      console.error('Failed to refresh scintillation:', error);
    }
  },

  refreshConstellations: async () => {
    try {
      const status = await getConstellationStatus();
      set({ constellationStatus: status });
    } catch (error) {
      console.error('Failed to refresh constellation status:', error);
    }
  },

  refreshAll: async (kp: number) => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().refreshTec(),
        get().refreshScintillation(kp),
        get().refreshConstellations(),
      ]);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to refresh GNSS data' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Selectors
export const useGnssPrimaryRegionTec = () => {
  return useGnssStore((state) => {
    if (!state.tecStatus || !state.primaryRegion) return null;
    return state.tecStatus.regions.find(
      (r) => r.regionLabel === state.primaryRegion?.label
    );
  });
};

export const useGnssOverallStatus = () => {
  return useGnssStore((state) => {
    const { tecStatus, scintillationStatus, constellationStatus } = state;

    if (!tecStatus || !constellationStatus) return 'loading';

    // Determine overall status
    if (
      tecStatus.global.condition.level === 'extreme' ||
      scintillationStatus?.current.severity === 'severe' ||
      constellationStatus.overallStatus === 'impaired'
    ) {
      return 'degraded';
    }

    if (
      tecStatus.global.condition.level === 'high' ||
      scintillationStatus?.current.severity === 'strong' ||
      constellationStatus.overallStatus === 'degraded'
    ) {
      return 'caution';
    }

    return 'nominal';
  });
};
```

**Step 2: Commit**

```bash
git add lib/state/useGnssStore.ts
git commit -m "feat: add GNSS store with TEC, scintillation, and constellation state"
```

---

## Task 5: Create TEC Map Component

**Files:**
- Create: `components/gnss/TecStatusCard.tsx`
- Create: `components/gnss/RegionalTecList.tsx`

**Step 1: Create TEC Status Card**

Create `components/gnss/TecStatusCard.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTecCondition, estimatePositionError } from '@/lib/api/parsers/tec';
import type { TecStatus } from '@/lib/api/tec';
import { COLORS } from '@/lib/util/colors';

interface TecStatusCardProps {
  status: TecStatus;
}

export function TecStatusCard({ status }: TecStatusCardProps) {
  const { global } = status;
  const condition = global.condition;
  const singleFreqError = estimatePositionError(global.mean, false);
  const dualFreqError = estimatePositionError(global.mean, true);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cellular" size={20} color={condition.color} />
        <Text style={styles.title}>Ionospheric TEC</Text>
        <View style={[styles.badge, { backgroundColor: condition.color + '20' }]}>
          <Text style={[styles.badgeText, { color: condition.color }]}>
            {condition.level.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.tecValue}>
        <Text style={styles.tecNumber}>{global.mean}</Text>
        <Text style={styles.tecUnit}>TECU</Text>
        <Text style={styles.tecMax}>(max: {global.max})</Text>
      </View>

      <Text style={styles.description}>{condition.gnssImpact}</Text>

      <View style={styles.errorEstimates}>
        <Text style={styles.errorTitle}>Estimated Position Error:</Text>
        <View style={styles.errorRow}>
          <View style={styles.errorItem}>
            <Text style={styles.errorLabel}>Single-freq</Text>
            <Text style={styles.errorValue}>±{singleFreqError.horizontalM}m H</Text>
            <Text style={styles.errorValue}>±{singleFreqError.verticalM}m V</Text>
          </View>
          <View style={styles.errorItem}>
            <Text style={styles.errorLabel}>Dual-freq</Text>
            <Text style={[styles.errorValue, { color: COLORS.emerald }]}>
              ±{dualFreqError.horizontalM}m H
            </Text>
            <Text style={[styles.errorValue, { color: COLORS.emerald }]}>
              ±{dualFreqError.verticalM}m V
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.updated}>
        Updated: {new Date(status.updatedAt).toLocaleTimeString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tecValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  tecNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
  },
  tecUnit: {
    fontSize: 14,
    color: COLORS.muted,
  },
  tecMax: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  errorEstimates: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  errorRow: {
    flexDirection: 'row',
    gap: 24,
  },
  errorItem: {
    flex: 1,
  },
  errorLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  errorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  updated: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
});
```

**Step 2: Create Regional TEC List**

Create `components/gnss/RegionalTecList.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTecCondition } from '@/lib/api/parsers/tec';
import type { RegionalTec } from '@/lib/api/parsers/tec';
import { COLORS } from '@/lib/util/colors';

interface RegionalTecListProps {
  regions: RegionalTec[];
}

export function RegionalTecList({ regions }: RegionalTecListProps) {
  if (regions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="location-outline" size={24} color={COLORS.muted} />
        <Text style={styles.emptyText}>No regions configured</Text>
        <Text style={styles.emptyHint}>Add regions to see localized TEC data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Regional TEC</Text>
      {regions.map((region) => {
        const condition = getTecCondition(region.meanTec);
        return (
          <View key={region.regionLabel} style={styles.regionCard}>
            <View style={styles.regionHeader}>
              <Text style={styles.regionName}>{region.regionLabel}</Text>
              <View style={[styles.dot, { backgroundColor: condition.color }]} />
            </View>
            <View style={styles.regionStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{region.meanTec}</Text>
                <Text style={styles.statLabel}>Mean</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{region.maxTec}</Text>
                <Text style={styles.statLabel}>Max</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{region.minTec}</Text>
                <Text style={styles.statLabel}>Min</Text>
              </View>
            </View>
            <Text style={styles.regionCondition}>{condition.description}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  empty: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  emptyHint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  regionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  regionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  regionStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  regionCondition: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
});
```

**Step 3: Commit**

```bash
git add components/gnss/TecStatusCard.tsx components/gnss/RegionalTecList.tsx
git commit -m "feat: add TEC status card and regional TEC list components"
```

---

## Task 6: Create Constellation Status Component

**Files:**
- Create: `components/gnss/ConstellationStatus.tsx`

**Step 1: Create constellation status component**

Create `components/gnss/ConstellationStatus.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getMultiConstellationImpact,
  type AllConstellationsStatus,
  type ConstellationHealth,
} from '@/lib/api/parsers/gnssConstellation';
import { COLORS } from '@/lib/util/colors';

interface ConstellationStatusProps {
  status: AllConstellationsStatus;
}

const CONSTELLATION_ICONS: Record<string, string> = {
  GPS: 'flag',
  GLONASS: 'snow',
  Galileo: 'star',
  BeiDou: 'planet',
};

function ConstellationCard({ health }: { health: ConstellationHealth }) {
  return (
    <View style={styles.constellationCard}>
      <View style={styles.constellationHeader}>
        <Ionicons
          name={CONSTELLATION_ICONS[health.constellation] as any}
          size={16}
          color={health.statusColor}
        />
        <Text style={styles.constellationName}>{health.constellation}</Text>
        <View style={[styles.statusDot, { backgroundColor: health.statusColor }]} />
      </View>

      <View style={styles.svCounts}>
        <Text style={styles.healthyCount}>{health.healthyCount}</Text>
        <Text style={styles.svLabel}>/{health.totalCount} SVs</Text>
      </View>

      <View style={styles.healthBar}>
        <View
          style={[
            styles.healthFill,
            {
              width: `${health.healthPercentage}%`,
              backgroundColor: health.statusColor,
            },
          ]}
        />
      </View>

      <Text style={[styles.statusText, { color: health.statusColor }]}>
        {health.status}
      </Text>
    </View>
  );
}

export function ConstellationStatus({ status }: ConstellationStatusProps) {
  const impact = getMultiConstellationImpact(status);

  const overallColor =
    status.overallStatus === 'operational' ? '#22c55e' :
    status.overallStatus === 'degraded' ? '#fbbf24' : '#f59e0b';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="globe-outline" size={20} color={overallColor} />
        <Text style={styles.title}>GNSS Constellations</Text>
        <View style={[styles.badge, { backgroundColor: overallColor + '20' }]}>
          <Text style={[styles.badgeText, { color: overallColor }]}>
            {status.overallStatus.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <ConstellationCard health={status.gps} />
        <ConstellationCard health={status.glonass} />
        <ConstellationCard health={status.galileo} />
        <ConstellationCard health={status.beidou} />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Available SVs:</Text>
          <Text style={styles.summaryValue}>{impact.availableSvs}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Geometry Impact:</Text>
          <Text style={[
            styles.summaryValue,
            { color: impact.geometryImpact === 'none' ? COLORS.emerald : '#f59e0b' }
          ]}>
            {impact.geometryImpact}
          </Text>
        </View>
      </View>

      <Text style={styles.recommendation}>{impact.recommendation}</Text>

      <Text style={styles.updated}>
        Updated: {new Date(status.updatedAt).toLocaleTimeString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  constellationCard: {
    width: '48%',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
  },
  constellationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  constellationName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  svCounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  healthyCount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  svLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 2,
  },
  healthBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summary: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  recommendation: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  updated: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
});
```

**Step 2: Commit**

```bash
git add components/gnss/ConstellationStatus.tsx
git commit -m "feat: add multi-constellation GNSS status component"
```

---

## Task 7: Create GNSS Dashboard Page

**Files:**
- Create: `components/gnss/ScintillationCard.tsx`
- Create: `components/gnss/AddRegionModal.tsx`
- Create: `app/gnss-dashboard.tsx`

**Step 1: Create Scintillation Card**

Create `components/gnss/ScintillationCard.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ScintillationStatus } from '@/lib/api/scintillation';
import { COLORS } from '@/lib/util/colors';

interface ScintillationCardProps {
  status: ScintillationStatus;
  regionName: string;
}

export function ScintillationCard({ status, regionName }: ScintillationCardProps) {
  const { current, forecast } = status;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="radio" size={20} color={current.color} />
        <Text style={styles.title}>Scintillation</Text>
        <View style={[styles.badge, { backgroundColor: current.color + '20' }]}>
          <Text style={[styles.badgeText, { color: current.color }]}>
            {current.severity.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.regionName}>{regionName}</Text>

      <Text style={styles.description}>{current.gnssImpact}</Text>

      <View style={styles.riskIndicator}>
        <Text style={styles.riskLabel}>Loss of Lock Risk:</Text>
        <View style={styles.riskBars}>
          {['low', 'moderate', 'high', 'very_high'].map((level, i) => (
            <View
              key={level}
              style={[
                styles.riskBar,
                {
                  backgroundColor:
                    i < ['low', 'moderate', 'high', 'very_high'].indexOf(current.lossOfLockRisk) + 1
                      ? current.color
                      : COLORS.border,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.riskText, { color: current.color }]}>
          {current.lossOfLockRisk.replace('_', ' ')}
        </Text>
      </View>

      <View style={styles.forecast}>
        <Text style={styles.forecastTitle}>Forecast</Text>
        <Text style={styles.forecastText}>{forecast.description}</Text>
      </View>

      <Text style={styles.updated}>
        Updated: {new Date(status.updatedAt).toLocaleTimeString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  regionName: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  riskIndicator: {
    marginBottom: 16,
  },
  riskLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  riskBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  riskBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  forecast: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  forecastTitle: {
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  forecastText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  updated: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
});
```

**Step 2: Create Add Region Modal**

Create `components/gnss/AddRegionModal.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '@/lib/util/colors';

interface AddRegionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (region: {
    label: string;
    center_lat: number;
    center_lng: number;
    radius_km: number;
    is_primary: boolean;
  }) => void;
}

export function AddRegionModal({ visible, onClose, onAdd }: AddRegionModalProps) {
  const [label, setLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('500');
  const [isPrimary, setIsPrimary] = useState(false);

  const handleAdd = () => {
    if (!label || !lat || !lng) return;

    onAdd({
      label,
      center_lat: parseFloat(lat),
      center_lng: parseFloat(lng),
      radius_km: parseFloat(radius) || 500,
      is_primary: isPrimary,
    });

    setLabel('');
    setLat('');
    setLng('');
    setRadius('500');
    setIsPrimary(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add GNSS Region</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Region Name *</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g., Denver Metro"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Latitude *</Text>
                <TextInput
                  style={styles.input}
                  value={lat}
                  onChangeText={setLat}
                  placeholder="39.7392"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Longitude *</Text>
                <TextInput
                  style={styles.input}
                  value={lng}
                  onChangeText={setLng}
                  placeholder="-104.9903"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Radius (km)</Text>
              <TextInput
                style={styles.input}
                value={radius}
                onChangeText={setRadius}
                placeholder="500"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>
                Area to monitor for localized TEC and scintillation
              </Text>
            </View>

            <View style={styles.switchField}>
              <View>
                <Text style={styles.label}>Primary Region</Text>
                <Text style={styles.hint}>
                  Used for scintillation forecasts
                </Text>
              </View>
              <Switch
                value={isPrimary}
                onValueChange={setIsPrimary}
                trackColor={{ false: COLORS.border, true: COLORS.emerald + '40' }}
                thumbColor={isPrimary ? COLORS.emerald : COLORS.muted}
              />
            </View>
          </View>

          <Pressable
            style={[styles.addButton, (!label || !lat || !lng) && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!label || !lat || !lng}
          >
            <Text style={styles.addButtonText}>Add Region</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: COLORS.emerald,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
```

**Step 3: Create GNSS Dashboard Page**

Create `app/gnss-dashboard.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { TecStatusCard } from '@/components/gnss/TecStatusCard';
import { RegionalTecList } from '@/components/gnss/RegionalTecList';
import { ConstellationStatus } from '@/components/gnss/ConstellationStatus';
import { ScintillationCard } from '@/components/gnss/ScintillationCard';
import { AddRegionModal } from '@/components/gnss/AddRegionModal';
import { useGnssStore, useGnssOverallStatus } from '@/lib/state/useGnssStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS } from '@/lib/util/colors';

export default function GnssDashboardPage() {
  const { kp } = useSolarStormStore();
  const {
    regions,
    primaryRegion,
    tecStatus,
    scintillationStatus,
    constellationStatus,
    isLoading,
    fetchRegions,
    addRegion,
    refreshAll,
  } = useGnssStore();
  const overallStatus = useGnssOverallStatus();

  const [showAddRegion, setShowAddRegion] = useState(false);

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    if (kp !== null) {
      refreshAll(kp);
    }
  }, [kp, regions.length]);

  const statusColor =
    overallStatus === 'nominal' ? '#22c55e' :
    overallStatus === 'caution' ? '#fbbf24' :
    overallStatus === 'degraded' ? '#f59e0b' : COLORS.muted;

  return (
    <FeatureGate feature="apiAccess">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>GNSS Operations</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {overallStatus === 'loading' ? 'Loading...' : overallStatus.toUpperCase()}
              </Text>
            </View>
          </View>
          <Pressable style={styles.addButton} onPress={() => setShowAddRegion(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Region</Text>
          </Pressable>
        </View>

        {isLoading && !tecStatus ? (
          <ActivityIndicator size="large" color={COLORS.emerald} style={styles.loader} />
        ) : (
          <>
            {/* Constellation Status */}
            {constellationStatus && (
              <ConstellationStatus status={constellationStatus} />
            )}

            {/* TEC Status */}
            {tecStatus && (
              <>
                <TecStatusCard status={tecStatus} />
                <RegionalTecList regions={tecStatus.regions} />
              </>
            )}

            {/* Scintillation */}
            {scintillationStatus && primaryRegion && (
              <ScintillationCard
                status={scintillationStatus}
                regionName={primaryRegion.label}
              />
            )}

            {/* RTK/PPP Alert */}
            {tecStatus && tecStatus.global.condition.level !== 'normal' && (
              <View style={styles.alertCard}>
                <Ionicons name="alert-circle" size={24} color="#f59e0b" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>RTK/PPP Advisory</Text>
                  <Text style={styles.alertText}>
                    Elevated ionospheric activity may affect precision positioning.
                    {tecStatus.global.condition.level === 'extreme' &&
                      ' Consider pausing precision operations.'}
                    {tecStatus.global.condition.level === 'high' &&
                      ' Monitor convergence times and fix availability.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Regions list */}
            {regions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Monitored Regions ({regions.length})</Text>
                {regions.map((region) => (
                  <View key={region.id} style={styles.regionItem}>
                    <View style={styles.regionInfo}>
                      <Text style={styles.regionName}>
                        {region.is_primary && '⭐ '}{region.label}
                      </Text>
                      <Text style={styles.regionCoords}>
                        {region.center_lat.toFixed(2)}°, {region.center_lng.toFixed(2)}° ({region.radius_km}km)
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {regions.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="navigate-outline" size={48} color={COLORS.muted} />
                <Text style={styles.emptyText}>No regions configured</Text>
                <Text style={styles.emptyHint}>
                  Add your operating regions to get localized TEC and scintillation data
                </Text>
              </View>
            )}
          </>
        )}

        <AddRegionModal
          visible={showAddRegion}
          onClose={() => setShowAddRegion(false)}
          onAdd={addRegion}
        />
      </ScrollView>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.emerald,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loader: {
    marginTop: 48,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  regionItem: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  regionInfo: {
    gap: 2,
  },
  regionName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  regionCoords: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: 'monospace',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
```

**Step 4: Commit**

```bash
git add components/gnss/ app/gnss-dashboard.tsx
git commit -m "feat: add GNSS operations dashboard with TEC, scintillation, and constellation status"
```

---

## Task 8: GNSS Correction Data Export

**Goal:** Allow GNSS engineers to export TEC and scintillation data for use in their own processing pipelines.

**Files:**
- Create: `supabase/functions/api-gnss/index.ts`
- Create: `services/gnss-export.ts`

**Step 1: Create GNSS data export service**

```typescript
// services/gnss-export.ts
import { supabase } from '@/lib/supabase';

export interface GnssExportOptions {
  startDate: Date;
  endDate: Date;
  dataTypes: ('tec' | 'scintillation' | 'constellation')[];
  regionIds?: string[];
  format: 'json' | 'csv' | 'rinex-like';
}

export interface TecExportRecord {
  timestamp: string;
  regionName: string;
  latitude: number;
  longitude: number;
  tecValue: number;
  tecUnit: string;
  singleFreqErrorM: number;
  dualFreqErrorM: number;
}

export interface ScintillationExportRecord {
  timestamp: string;
  regionName: string;
  latitude: number;
  longitude: number;
  s4Index: number;
  sigmaPhiRad: number;
  riskLevel: string;
  lossOfLockProbability: number;
}

export async function exportTecData(
  userId: string,
  options: GnssExportOptions
): Promise<TecExportRecord[]> {
  let query = supabase
    .from('tec_history')
    .select(`
      *,
      gnss_regions!inner (name, latitude, longitude)
    `)
    .gte('recorded_at', options.startDate.toISOString())
    .lte('recorded_at', options.endDate.toISOString());

  if (options.regionIds && options.regionIds.length > 0) {
    query = query.in('region_id', options.regionIds);
  }

  // Join with user's regions
  query = query.eq('gnss_regions.user_id', userId);

  const { data, error } = await query.order('recorded_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    timestamp: row.recorded_at,
    regionName: row.gnss_regions.name,
    latitude: row.gnss_regions.latitude,
    longitude: row.gnss_regions.longitude,
    tecValue: row.tec_value,
    tecUnit: 'TECU',
    singleFreqErrorM: row.tec_value * 0.163, // L1 frequency
    dualFreqErrorM: row.tec_value * 0.01,    // Dual-frequency corrected
  }));
}

export async function exportScintillationData(
  userId: string,
  options: GnssExportOptions
): Promise<ScintillationExportRecord[]> {
  let query = supabase
    .from('scintillation_history')
    .select(`
      *,
      gnss_regions!inner (name, latitude, longitude)
    `)
    .gte('recorded_at', options.startDate.toISOString())
    .lte('recorded_at', options.endDate.toISOString());

  if (options.regionIds && options.regionIds.length > 0) {
    query = query.in('region_id', options.regionIds);
  }

  query = query.eq('gnss_regions.user_id', userId);

  const { data, error } = await query.order('recorded_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => {
    // Estimate loss of lock probability from S4 index
    let lossProb = 0;
    if (row.s4_index > 0.7) lossProb = 0.8;
    else if (row.s4_index > 0.5) lossProb = 0.4;
    else if (row.s4_index > 0.3) lossProb = 0.15;
    else if (row.s4_index > 0.2) lossProb = 0.05;

    return {
      timestamp: row.recorded_at,
      regionName: row.gnss_regions.name,
      latitude: row.gnss_regions.latitude,
      longitude: row.gnss_regions.longitude,
      s4Index: row.s4_index,
      sigmaPhiRad: row.sigma_phi,
      riskLevel: row.risk_level,
      lossOfLockProbability: lossProb,
    };
  });
}

export function formatAsCSV<T extends Record<string, any>>(data: T[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return String(val ?? '');
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// RINEX-like format for TEC data (simplified)
export function formatAsRinexLike(data: TecExportRecord[]): string {
  const lines: string[] = [
    'GNSS TEC EXPORT FILE',
    `GENERATED: ${new Date().toISOString()}`,
    'FORMAT: RINEX-LIKE IONOSPHERE',
    '',
    'EPOCH               LAT      LON      TEC(TECU)  ERR_L1(m)  ERR_DF(m)',
    '-'.repeat(72),
  ];

  for (const row of data) {
    const epoch = row.timestamp.replace('T', ' ').substring(0, 19);
    const lat = row.latitude.toFixed(4).padStart(8);
    const lon = row.longitude.toFixed(4).padStart(9);
    const tec = row.tecValue.toFixed(2).padStart(10);
    const errL1 = row.singleFreqErrorM.toFixed(3).padStart(10);
    const errDF = row.dualFreqErrorM.toFixed(3).padStart(10);
    lines.push(`${epoch} ${lat} ${lon} ${tec} ${errL1} ${errDF}`);
  }

  return lines.join('\n');
}
```

**Step 2: Create GNSS API endpoint**

```typescript
// supabase/functions/api-gnss/index.ts
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Validate API key and check Pro tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, subscription_tier')
    .eq('api_key', apiKey)
    .single();

  if (!profile || profile.subscription_tier === 'free') {
    return new Response(
      JSON.stringify({ error: 'Valid Pro API key required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const dataType = url.searchParams.get('type') || 'tec';
  const format = url.searchParams.get('format') || 'json';
  const startDate = url.searchParams.get('start') || new Date(Date.now() - 24*60*60*1000).toISOString();
  const endDate = url.searchParams.get('end') || new Date().toISOString();

  let data: any[];
  let filename: string;

  if (dataType === 'tec') {
    const { data: tecData, error } = await supabase
      .from('tec_history')
      .select(`*, gnss_regions!inner (name, latitude, longitude, user_id)`)
      .eq('gnss_regions.user_id', profile.id)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)
      .order('recorded_at', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    data = tecData || [];
    filename = 'tec_data';
  } else if (dataType === 'scintillation') {
    const { data: scintData, error } = await supabase
      .from('scintillation_history')
      .select(`*, gnss_regions!inner (name, latitude, longitude, user_id)`)
      .eq('gnss_regions.user_id', profile.id)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)
      .order('recorded_at', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    data = scintData || [];
    filename = 'scintillation_data';
  } else {
    return new Response(
      JSON.stringify({ error: 'Invalid data type. Use: tec, scintillation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (format === 'csv') {
    const csv = convertToCSV(data);
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  return new Response(
    JSON.stringify({ data, count: data.length, dataType, startDate, endDate }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]).filter(k => k !== 'gnss_regions');
  const rows = data.map(row =>
    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
```

**Step 3: Commit**

```bash
git add services/gnss-export.ts supabase/functions/api-gnss/index.ts
git commit -m "feat: add GNSS correction data export API with CSV and JSON formats"
```

---

## Summary

Phase 3 delivers the core GNSS operations features:

1. **TEC Data Pipeline** - Ionospheric Total Electron Content from NOAA SWPC
2. **Regional TEC Monitoring** - Localized TEC for user-defined operating areas
3. **Position Error Estimation** - Single-freq vs dual-freq error estimates
4. **Scintillation Forecasting** - Equatorial and auroral scintillation prediction
5. **Loss of Lock Risk** - GNSS signal stability assessment
6. **Multi-Constellation Status** - GPS/GLONASS/Galileo/BeiDou health tracking
7. **RTK/PPP Advisories** - Precision positioning degradation alerts
8. **GNSS Correction Data Export** - REST API with CSV/JSON for TEC and scintillation data

**All features are Pro-tier gated** via the `apiAccess` feature flag.

**Next Steps (Phase 4 - Nice-to-Have):**
- 3D Aurora globe
- Location-based aurora predictions
- HF propagation maps
- Photo planning mode
- Consumer "wow factor" features

---

## Quick Reference

**Run app:**
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm run web
```

**Run tests:**
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm test
```

**Key data sources:**
- NOAA SWPC US TEC: `https://services.swpc.noaa.gov/json/us_tec.json`
- Scintillation: Predicted from Kp + location + time (no direct API)
- Constellation status: Stored in Supabase (populated by background job)
