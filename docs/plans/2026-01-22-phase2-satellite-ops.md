# Phase 2: Satellite Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core satellite operations features that justify Pro tier ($49/month) for satellite operators - fleet management, drag risk assessment, particle flux monitoring, and anomaly correlation.

**Architecture:** Supabase for fleet storage, NOAA SWPC APIs for particle flux data, Space-Track.org/CelesTrak for TLE data, Edge Functions for risk calculations. All satellite features are Pro-tier gated.

**Tech Stack:** Supabase (Postgres, Edge Functions), NOAA SWPC APIs, Space-Track API, Zustand state, existing feature gating from Phase 1

**Prerequisites:** Phase 1 must be complete (Supabase auth, Stripe subscriptions, feature gating, satellite/GNSS database tables)

---

## Task 1: Create Particle Flux Data Pipeline

**Files:**
- Create: `lib/api/parsers/particleFlux.ts`
- Create: `lib/api/particleFlux.ts`
- Create: `supabase/functions/ingest-particle-flux/index.ts`

**Step 1: Create particle flux parser**

Create `lib/api/parsers/particleFlux.ts`:
```typescript
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
```

**Step 2: Create particle flux API functions**

Create `lib/api/particleFlux.ts`:
```typescript
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
```

**Step 3: Commit**

```bash
git add lib/api/parsers/particleFlux.ts lib/api/particleFlux.ts
git commit -m "feat: add particle flux data pipeline for satellite operations"
```

---

## Task 2: Create Satellite Fleet Store

**Files:**
- Create: `lib/state/useSatelliteStore.ts`

**Step 1: Create satellite fleet store**

Create `lib/state/useSatelliteStore.ts`:
```typescript
import { create } from 'zustand';
import { supabase } from '../supabase/client';
import type { Satellite, SatelliteAnomaly, OrbitType } from '../supabase/types';

interface SatelliteState {
  // Data
  satellites: Satellite[];
  anomalies: SatelliteAnomaly[];
  selectedSatellite: Satellite | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSatellites: () => Promise<void>;
  fetchAnomalies: (satelliteId?: string) => Promise<void>;
  addSatellite: (satellite: Omit<Satellite, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Satellite | null>;
  updateSatellite: (id: string, updates: Partial<Satellite>) => Promise<void>;
  deleteSatellite: (id: string) => Promise<void>;
  selectSatellite: (satellite: Satellite | null) => void;

  // Anomaly actions
  addAnomaly: (anomaly: Omit<SatelliteAnomaly, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteAnomaly: (id: string) => Promise<void>;

  // Bulk operations
  importSatellitesFromCSV: (csvData: string) => Promise<{ success: number; failed: number }>;
}

export const useSatelliteStore = create<SatelliteState>((set, get) => ({
  satellites: [],
  anomalies: [],
  selectedSatellite: null,
  isLoading: false,
  error: null,

  fetchSatellites: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('satellites')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ satellites: data || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch satellites',
        isLoading: false,
      });
    }
  },

  fetchAnomalies: async (satelliteId?: string) => {
    try {
      let query = supabase
        .from('satellite_anomalies')
        .select('*')
        .order('occurred_at', { ascending: false });

      if (satelliteId) {
        query = query.eq('satellite_id', satelliteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ anomalies: data || [] });
    } catch (error) {
      console.error('Failed to fetch anomalies:', error);
    }
  },

  addSatellite: async (satellite) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('satellites')
        .insert({
          ...satellite,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        satellites: [...state.satellites, data],
        isLoading: false,
      }));

      return data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add satellite',
        isLoading: false,
      });
      return null;
    }
  },

  updateSatellite: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('satellites')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        satellites: state.satellites.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
        selectedSatellite:
          state.selectedSatellite?.id === id
            ? { ...state.selectedSatellite, ...updates }
            : state.selectedSatellite,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update satellite',
        isLoading: false,
      });
    }
  },

  deleteSatellite: async (id) => {
    try {
      const { error } = await supabase
        .from('satellites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        satellites: state.satellites.filter((s) => s.id !== id),
        selectedSatellite:
          state.selectedSatellite?.id === id ? null : state.selectedSatellite,
      }));
    } catch (error) {
      console.error('Failed to delete satellite:', error);
    }
  },

  selectSatellite: (satellite) => {
    set({ selectedSatellite: satellite });
    if (satellite) {
      get().fetchAnomalies(satellite.id);
    }
  },

  addAnomaly: async (anomaly) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current space weather data for correlation
      const { data: kpData } = await supabase
        .from('kp_history')
        .select('value')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const { data: protonData } = await supabase
        .from('proton_flux_history')
        .select('flux_10mev')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const { data: electronData } = await supabase
        .from('electron_flux_history')
        .select('flux_2mev')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('satellite_anomalies')
        .insert({
          ...anomaly,
          user_id: user.id,
          kp_at_time: kpData?.value ?? null,
          proton_flux_at_time: protonData?.flux_10mev ?? null,
          electron_flux_at_time: electronData?.flux_2mev ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        anomalies: [data, ...state.anomalies],
      }));
    } catch (error) {
      console.error('Failed to add anomaly:', error);
    }
  },

  deleteAnomaly: async (id) => {
    try {
      const { error } = await supabase
        .from('satellite_anomalies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        anomalies: state.anomalies.filter((a) => a.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete anomaly:', error);
    }
  },

  importSatellitesFromCSV: async (csvData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const lines = csvData.trim().split('\n');
    const header = lines[0].toLowerCase().split(',').map((h) => h.trim());

    let success = 0;
    let failed = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      try {
        const satellite = {
          user_id: user.id,
          name: row.name || `Satellite ${i}`,
          norad_id: row.norad_id ? parseInt(row.norad_id) : null,
          altitude_km: parseFloat(row.altitude_km || row.altitude) || 400,
          inclination_deg: parseFloat(row.inclination_deg || row.inclination) || 0,
          ballistic_coefficient: row.ballistic_coefficient ? parseFloat(row.ballistic_coefficient) : null,
          orbit_type: (row.orbit_type?.toUpperCase() || 'LEO') as OrbitType,
          is_orbit_raising: row.is_orbit_raising === 'true',
          launch_date: row.launch_date || null,
          notes: row.notes || null,
          org_id: null,
        };

        const { error } = await supabase.from('satellites').insert(satellite);
        if (error) throw error;
        success++;
      } catch {
        failed++;
      }
    }

    await get().fetchSatellites();
    return { success, failed };
  },
}));

// Derived selectors
export const useSatellitesByOrbit = () => {
  return useSatelliteStore((state) => {
    const byOrbit: Record<OrbitType, Satellite[]> = {
      LEO: [],
      MEO: [],
      GEO: [],
      HEO: [],
    };

    for (const sat of state.satellites) {
      byOrbit[sat.orbit_type].push(sat);
    }

    return byOrbit;
  });
};

export const useOrbitRaisingSatellites = () => {
  return useSatelliteStore((state) =>
    state.satellites.filter((s) => s.is_orbit_raising)
  );
};
```

**Step 2: Commit**

```bash
git add lib/state/useSatelliteStore.ts
git commit -m "feat: add satellite fleet store with CRUD and CSV import"
```

---

## Task 3: Create Drag Risk Calculator

**Files:**
- Create: `lib/services/dragRisk.ts`

**Step 1: Create drag risk calculation service**

Create `lib/services/dragRisk.ts`:
```typescript
import type { Satellite } from '../supabase/types';

export interface DragRiskAssessment {
  satellite: Satellite;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  densityIncreaseFactor: number;
  estimatedDecayDays: number | null;
  recommendation: string;
  color: string;
}

export interface ThermosphericConditions {
  kp: number;
  f107: number; // Solar flux index
  apIndex: number; // Geomagnetic index
}

// Simplified NRLMSISE-00 density model approximation
// Real implementation would use full atmospheric model
function estimateDensityIncrease(
  altitudeKm: number,
  kp: number,
  f107: number = 150
): number {
  // Base density increase factor from Kp
  // Higher Kp = more geomagnetic heating = thermosphere expansion = higher density at altitude
  const kpFactor = 1 + (kp / 9) * 2.5; // Up to 3.5x at Kp=9

  // F10.7 solar flux effect (higher flux = more heating)
  const f107Factor = 1 + ((f107 - 70) / 230) * 1.5; // 70-300 SFU range

  // Altitude scaling - effect is stronger at lower LEO
  const altitudeFactor = altitudeKm < 300 ? 1.5 :
                         altitudeKm < 400 ? 1.3 :
                         altitudeKm < 500 ? 1.1 :
                         altitudeKm < 600 ? 1.0 : 0.8;

  return kpFactor * f107Factor * altitudeFactor;
}

// Simplified decay estimation
function estimateDecayDays(
  altitudeKm: number,
  ballisticCoefficient: number | null,
  densityFactor: number
): number | null {
  if (!ballisticCoefficient) return null;

  // Rough approximation - real calculation needs orbital mechanics
  // Higher ballistic coefficient = more drag = faster decay
  const baseDecay = altitudeKm < 300 ? 30 :
                    altitudeKm < 400 ? 180 :
                    altitudeKm < 500 ? 730 :
                    altitudeKm < 600 ? 3650 : 36500;

  // Adjust for ballistic coefficient (typical range 20-200 kg/m²)
  const bcFactor = 50 / (ballisticCoefficient || 50);

  // Adjust for density increase
  const decayDays = baseDecay / (densityFactor * bcFactor);

  return Math.round(decayDays);
}

export function calculateDragRisk(
  satellite: Satellite,
  kp: number,
  f107: number = 150
): DragRiskAssessment {
  // Only calculate for LEO satellites
  if (satellite.orbit_type !== 'LEO') {
    return {
      satellite,
      riskLevel: 'low',
      densityIncreaseFactor: 1,
      estimatedDecayDays: null,
      recommendation: 'Drag risk not applicable for non-LEO orbits',
      color: '#22c55e',
    };
  }

  const densityFactor = estimateDensityIncrease(satellite.altitude_km, kp, f107);
  const decayDays = estimateDecayDays(
    satellite.altitude_km,
    satellite.ballistic_coefficient,
    densityFactor
  );

  // Determine risk level
  let riskLevel: DragRiskAssessment['riskLevel'];
  let recommendation: string;
  let color: string;

  if (densityFactor >= 3 || (decayDays !== null && decayDays < 30)) {
    riskLevel = 'critical';
    color = '#dc2626';
    recommendation = satellite.is_orbit_raising
      ? 'URGENT: Accelerate orbit-raising burns immediately before storm peak'
      : 'Consider emergency orbit-raising maneuver if fuel available';
  } else if (densityFactor >= 2.5 || (decayDays !== null && decayDays < 90)) {
    riskLevel = 'high';
    color = '#f59e0b';
    recommendation = satellite.is_orbit_raising
      ? 'Recommend advancing scheduled orbit-raising burns'
      : 'Monitor closely; prepare contingency maneuver plan';
  } else if (densityFactor >= 1.5 || (decayDays !== null && decayDays < 180)) {
    riskLevel = 'moderate';
    color = '#fbbf24';
    recommendation = 'Increased drag expected; monitor orbital elements';
  } else {
    riskLevel = 'low';
    color = '#22c55e';
    recommendation = 'Normal operations; no immediate drag concerns';
  }

  return {
    satellite,
    riskLevel,
    densityIncreaseFactor: Math.round(densityFactor * 100) / 100,
    estimatedDecayDays: decayDays,
    recommendation,
    color,
  };
}

export function calculateFleetDragRisk(
  satellites: Satellite[],
  kp: number,
  f107: number = 150
): DragRiskAssessment[] {
  return satellites
    .filter((s) => s.orbit_type === 'LEO')
    .map((s) => calculateDragRisk(s, kp, f107))
    .sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });
}
```

**Step 2: Commit**

```bash
git add lib/services/dragRisk.ts
git commit -m "feat: add drag risk calculator for LEO satellites"
```

---

## Task 4: Create Satellite Fleet Manager UI

**Files:**
- Create: `components/satellite/SatelliteFleetManager.tsx`
- Create: `components/satellite/SatelliteCard.tsx`
- Create: `components/satellite/AddSatelliteModal.tsx`
- Create: `app/satellites.tsx`

**Step 1: Create SatelliteCard component**

Create `components/satellite/SatelliteCard.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Satellite } from '@/lib/supabase/types';
import type { DragRiskAssessment } from '@/lib/services/dragRisk';
import { COLORS } from '@/lib/util/colors';

interface SatelliteCardProps {
  satellite: Satellite;
  dragRisk?: DragRiskAssessment;
  onPress: () => void;
  onDelete?: () => void;
}

export function SatelliteCard({ satellite, dragRisk, onPress, onDelete }: SatelliteCardProps) {
  const orbitColor = {
    LEO: '#3b82f6',
    MEO: '#8b5cf6',
    GEO: '#f59e0b',
    HEO: '#ec4899',
  }[satellite.orbit_type];

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{satellite.name}</Text>
          {satellite.is_orbit_raising && (
            <View style={styles.orbitRaisingBadge}>
              <Ionicons name="rocket" size={12} color="#f59e0b" />
              <Text style={styles.orbitRaisingText}>Orbit Raising</Text>
            </View>
          )}
        </View>
        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <View style={[styles.orbitBadge, { backgroundColor: orbitColor + '20' }]}>
            <Text style={[styles.orbitText, { color: orbitColor }]}>
              {satellite.orbit_type}
            </Text>
          </View>
          <Text style={styles.detailText}>
            {satellite.altitude_km.toFixed(0)} km • {satellite.inclination_deg.toFixed(1)}°
          </Text>
        </View>

        {satellite.norad_id && (
          <Text style={styles.noradId}>NORAD: {satellite.norad_id}</Text>
        )}
      </View>

      {dragRisk && satellite.orbit_type === 'LEO' && (
        <View style={[styles.riskBanner, { backgroundColor: dragRisk.color + '15' }]}>
          <View style={[styles.riskDot, { backgroundColor: dragRisk.color }]} />
          <Text style={[styles.riskText, { color: dragRisk.color }]}>
            {dragRisk.riskLevel.toUpperCase()} drag risk
          </Text>
          <Text style={styles.riskFactor}>
            {dragRisk.densityIncreaseFactor}x density
          </Text>
        </View>
      )}
    </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  orbitRaisingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  orbitRaisingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orbitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orbitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  noradId: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: 'monospace',
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  riskFactor: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
```

**Step 2: Create AddSatelliteModal component**

Create `components/satellite/AddSatelliteModal.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { OrbitType } from '@/lib/supabase/types';
import { COLORS } from '@/lib/util/colors';

interface AddSatelliteModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (satellite: {
    name: string;
    norad_id: number | null;
    altitude_km: number;
    inclination_deg: number;
    ballistic_coefficient: number | null;
    orbit_type: OrbitType;
    is_orbit_raising: boolean;
    launch_date: string | null;
    notes: string | null;
    org_id: null;
  }) => void;
}

const ORBIT_TYPES: OrbitType[] = ['LEO', 'MEO', 'GEO', 'HEO'];

export function AddSatelliteModal({ visible, onClose, onAdd }: AddSatelliteModalProps) {
  const [name, setName] = useState('');
  const [noradId, setNoradId] = useState('');
  const [altitude, setAltitude] = useState('');
  const [inclination, setInclination] = useState('');
  const [ballisticCoeff, setBallisticCoeff] = useState('');
  const [orbitType, setOrbitType] = useState<OrbitType>('LEO');
  const [isOrbitRaising, setIsOrbitRaising] = useState(false);
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!name || !altitude || !inclination) return;

    onAdd({
      name,
      norad_id: noradId ? parseInt(noradId) : null,
      altitude_km: parseFloat(altitude),
      inclination_deg: parseFloat(inclination),
      ballistic_coefficient: ballisticCoeff ? parseFloat(ballisticCoeff) : null,
      orbit_type: orbitType,
      is_orbit_raising: isOrbitRaising,
      launch_date: null,
      notes: notes || null,
      org_id: null,
    });

    // Reset form
    setName('');
    setNoradId('');
    setAltitude('');
    setInclination('');
    setBallisticCoeff('');
    setOrbitType('LEO');
    setIsOrbitRaising(false);
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Satellite</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Starlink-1234"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>NORAD ID (optional)</Text>
              <TextInput
                style={styles.input}
                value={noradId}
                onChangeText={setNoradId}
                placeholder="e.g., 48274"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Altitude (km) *</Text>
                <TextInput
                  style={styles.input}
                  value={altitude}
                  onChangeText={setAltitude}
                  placeholder="550"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Inclination (°) *</Text>
                <TextInput
                  style={styles.input}
                  value={inclination}
                  onChangeText={setInclination}
                  placeholder="53"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ballistic Coefficient (kg/m²)</Text>
              <TextInput
                style={styles.input}
                value={ballisticCoeff}
                onChangeText={setBallisticCoeff}
                placeholder="e.g., 50"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>
                Used for drag calculations. Lower = more drag.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Orbit Type</Text>
              <View style={styles.orbitButtons}>
                {ORBIT_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.orbitButton,
                      orbitType === type && styles.orbitButtonActive,
                    ]}
                    onPress={() => setOrbitType(type)}
                  >
                    <Text
                      style={[
                        styles.orbitButtonText,
                        orbitType === type && styles.orbitButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.switchField}>
              <View>
                <Text style={styles.label}>Orbit Raising Mode</Text>
                <Text style={styles.hint}>
                  Enable for newly launched satellites in orbit-raising phase
                </Text>
              </View>
              <Switch
                value={isOrbitRaising}
                onValueChange={setIsOrbitRaising}
                trackColor={{ false: COLORS.border, true: '#f59e0b40' }}
                thumbColor={isOrbitRaising ? '#f59e0b' : COLORS.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Mission notes, configuration, etc."
                placeholderTextColor={COLORS.muted}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <Pressable
            style={[styles.addButton, (!name || !altitude || !inclination) && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!name || !altitude || !inclination}
          >
            <Text style={styles.addButtonText}>Add Satellite</Text>
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
    maxHeight: '90%',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  orbitButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  orbitButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orbitButtonActive: {
    backgroundColor: COLORS.emerald + '20',
    borderColor: COLORS.emerald,
  },
  orbitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  orbitButtonTextActive: {
    color: COLORS.emerald,
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

**Step 3: Create SatelliteFleetManager component**

Create `components/satellite/SatelliteFleetManager.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { useSatelliteStore, useSatellitesByOrbit } from '@/lib/state/useSatelliteStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { calculateFleetDragRisk, type DragRiskAssessment } from '@/lib/services/dragRisk';
import { COLORS } from '@/lib/util/colors';
import { SatelliteCard } from './SatelliteCard';
import { AddSatelliteModal } from './AddSatelliteModal';

export function SatelliteFleetManager() {
  const { satellites, isLoading, fetchSatellites, addSatellite, deleteSatellite, selectSatellite } = useSatelliteStore();
  const satellitesByOrbit = useSatellitesByOrbit();
  const { kp } = useSolarStormStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [dragRisks, setDragRisks] = useState<DragRiskAssessment[]>([]);

  useEffect(() => {
    fetchSatellites();
  }, []);

  useEffect(() => {
    if (satellites.length > 0 && kp !== null) {
      const risks = calculateFleetDragRisk(satellites, kp);
      setDragRisks(risks);
    }
  }, [satellites, kp]);

  const getRiskForSatellite = (id: string) => dragRisks.find((r) => r.satellite.id === id);

  const criticalCount = dragRisks.filter((r) => r.riskLevel === 'critical').length;
  const highCount = dragRisks.filter((r) => r.riskLevel === 'high').length;

  return (
    <FeatureGate feature="satelliteRisk">
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Satellite Fleet</Text>
            <Text style={styles.subtitle}>
              {satellites.length} satellite{satellites.length !== 1 ? 's' : ''} tracked
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {/* Risk summary */}
        {(criticalCount > 0 || highCount > 0) && (
          <View style={styles.riskSummary}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.riskSummaryText}>
              {criticalCount > 0 && `${criticalCount} critical`}
              {criticalCount > 0 && highCount > 0 && ', '}
              {highCount > 0 && `${highCount} high`} risk satellite{criticalCount + highCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.emerald} style={styles.loader} />
        ) : satellites.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="planet-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No satellites tracked</Text>
            <Text style={styles.emptyHint}>
              Add satellites to monitor drag risk and space weather impacts
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {/* LEO satellites first (most affected by drag) */}
            {satellitesByOrbit.LEO.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  LEO ({satellitesByOrbit.LEO.length})
                </Text>
                {satellitesByOrbit.LEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    dragRisk={getRiskForSatellite(sat.id)}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </View>
            )}

            {/* MEO satellites */}
            {satellitesByOrbit.MEO.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  MEO ({satellitesByOrbit.MEO.length})
                </Text>
                {satellitesByOrbit.MEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </View>
            )}

            {/* GEO satellites */}
            {satellitesByOrbit.GEO.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  GEO ({satellitesByOrbit.GEO.length})
                </Text>
                {satellitesByOrbit.GEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </View>
            )}

            {/* HEO satellites */}
            {satellitesByOrbit.HEO.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  HEO ({satellitesByOrbit.HEO.length})
                </Text>
                {satellitesByOrbit.HEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}

        <AddSatelliteModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={addSatellite}
        />
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
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
  riskSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f59e0b15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  riskSummaryText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '500',
  },
  loader: {
    marginTop: 48,
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
  list: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
```

**Step 4: Create satellites page**

Create `app/satellites.tsx`:
```typescript
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SatelliteFleetManager } from '@/components/satellite/SatelliteFleetManager';
import { COLORS } from '@/lib/util/colors';

export default function SatellitesPage() {
  return (
    <View style={styles.container}>
      <SatelliteFleetManager />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
  },
});
```

**Step 5: Commit**

```bash
git add components/satellite/ app/satellites.tsx
git commit -m "feat: add satellite fleet manager with drag risk display"
```

---

## Task 5: Create Particle Flux Status Widget

**Files:**
- Create: `components/satellite/ParticleFluxWidget.tsx`

**Step 1: Create particle flux status widget**

Create `components/satellite/ParticleFluxWidget.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import {
  getParticleFluxStatus,
  type ParticleFluxStatus,
} from '@/lib/api/particleFlux';
import { COLORS } from '@/lib/util/colors';

export function ParticleFluxWidget() {
  const [status, setStatus] = useState<ParticleFluxStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getParticleFluxStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load particle flux:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={COLORS.emerald} />
      </View>
    );
  }

  if (!status) return null;

  const { proton, electron } = status;

  return (
    <FeatureGate feature="satelliteRisk">
      <View style={styles.container}>
        <Text style={styles.title}>Particle Environment</Text>

        {/* Solar Radiation Storm (Protons) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash" size={20} color={proton.sScale.color} />
            <Text style={styles.cardTitle}>Solar Radiation Storm</Text>
            <View style={[styles.badge, { backgroundColor: proton.sScale.color + '20' }]}>
              <Text style={[styles.badgeText, { color: proton.sScale.color }]}>
                {proton.sScale.scale}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{proton.sScale.description}</Text>
          <Text style={styles.cardImpact}>{proton.sScale.impact}</Text>
          {proton.latest && (
            <View style={styles.readings}>
              <View style={styles.reading}>
                <Text style={styles.readingLabel}>{'>'}10 MeV</Text>
                <Text style={styles.readingValue}>
                  {proton.latest.flux_10mev?.toExponential(1) ?? 'N/A'} pfu
                </Text>
              </View>
              <View style={styles.reading}>
                <Text style={styles.readingLabel}>{'>'}100 MeV</Text>
                <Text style={styles.readingValue}>
                  {proton.latest.flux_100mev?.toExponential(1) ?? 'N/A'} pfu
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* GEO Electron Environment */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="remove-circle" size={20} color={electron.chargingRisk.color} />
            <Text style={styles.cardTitle}>GEO Surface Charging</Text>
            <View style={[styles.badge, { backgroundColor: electron.chargingRisk.color + '20' }]}>
              <Text style={[styles.badgeText, { color: electron.chargingRisk.color }]}>
                {electron.chargingRisk.level.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{electron.chargingRisk.description}</Text>
          {electron.latest && (
            <View style={styles.readings}>
              <View style={styles.reading}>
                <Text style={styles.readingLabel}>{'>'}2 MeV e-</Text>
                <Text style={styles.readingValue}>
                  {electron.latest.flux_2mev?.toExponential(1) ?? 'N/A'} e/(cm²·s·sr)
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.updated}>
          Updated: {new Date(status.updatedAt).toLocaleTimeString()}
        </Text>
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardImpact: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },
  readings: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reading: {
    gap: 2,
  },
  readingLabel: {
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  readingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  updated: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
});
```

**Step 2: Commit**

```bash
git add components/satellite/ParticleFluxWidget.tsx
git commit -m "feat: add particle flux status widget with S-scale and charging risk"
```

---

## Task 6: Create Anomaly Logger

**Files:**
- Create: `components/satellite/AnomalyLogger.tsx`
- Create: `components/satellite/AnomalyList.tsx`

**Step 1: Create AnomalyLogger component**

Create `components/satellite/AnomalyLogger.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { AnomalyType, AnomalySeverity } from '@/lib/supabase/types';
import { COLORS } from '@/lib/util/colors';

interface AnomalyLoggerProps {
  visible: boolean;
  satelliteId: string;
  satelliteName: string;
  onClose: () => void;
  onLog: (anomaly: {
    satellite_id: string;
    anomaly_type: AnomalyType;
    severity: AnomalySeverity;
    description: string | null;
    occurred_at: string;
  }) => void;
}

const ANOMALY_TYPES: { value: AnomalyType; label: string; icon: string }[] = [
  { value: 'safe_mode', label: 'Safe Mode', icon: 'shield-checkmark' },
  { value: 'reboot', label: 'Reboot', icon: 'refresh' },
  { value: 'sensor_error', label: 'Sensor Error', icon: 'thermometer' },
  { value: 'comm_loss', label: 'Comm Loss', icon: 'radio' },
  { value: 'attitude_error', label: 'Attitude Error', icon: 'compass' },
  { value: 'power_anomaly', label: 'Power Anomaly', icon: 'battery-half' },
  { value: 'other', label: 'Other', icon: 'alert-circle' },
];

const SEVERITIES: { value: AnomalySeverity; label: string; color: string }[] = [
  { value: 'minor', label: 'Minor', color: '#22c55e' },
  { value: 'moderate', label: 'Moderate', color: '#fbbf24' },
  { value: 'severe', label: 'Severe', color: '#f59e0b' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

export function AnomalyLogger({
  visible,
  satelliteId,
  satelliteName,
  onClose,
  onLog,
}: AnomalyLoggerProps) {
  const [type, setType] = useState<AnomalyType>('safe_mode');
  const [severity, setSeverity] = useState<AnomalySeverity>('moderate');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));

  const handleLog = () => {
    onLog({
      satellite_id: satelliteId,
      anomaly_type: type,
      severity,
      description: description || null,
      occurred_at: new Date(occurredAt).toISOString(),
    });

    // Reset
    setType('safe_mode');
    setSeverity('moderate');
    setDescription('');
    setOccurredAt(new Date().toISOString().slice(0, 16));
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Log Anomaly</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <Text style={styles.satelliteName}>{satelliteName}</Text>

          <ScrollView style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Anomaly Type</Text>
              <View style={styles.typeGrid}>
                {ANOMALY_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[styles.typeButton, type === t.value && styles.typeButtonActive]}
                    onPress={() => setType(t.value)}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={20}
                      color={type === t.value ? COLORS.emerald : COLORS.muted}
                    />
                    <Text
                      style={[styles.typeText, type === t.value && styles.typeTextActive]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Severity</Text>
              <View style={styles.severityRow}>
                {SEVERITIES.map((s) => (
                  <Pressable
                    key={s.value}
                    style={[
                      styles.severityButton,
                      severity === s.value && { backgroundColor: s.color + '20', borderColor: s.color },
                    ]}
                    onPress={() => setSeverity(s.value)}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        severity === s.value && { color: s.color },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>When did this occur?</Text>
              <TextInput
                style={styles.input}
                value={occurredAt}
                onChangeText={setOccurredAt}
                placeholder="YYYY-MM-DDTHH:MM"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What happened? Any telemetry notes?"
                placeholderTextColor={COLORS.muted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.emerald} />
              <Text style={styles.infoText}>
                Space weather conditions at the time of the anomaly will be automatically recorded for correlation analysis.
              </Text>
            </View>
          </ScrollView>

          <Pressable style={styles.logButton} onPress={handleLog}>
            <Text style={styles.logButtonText}>Log Anomaly</Text>
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
    maxHeight: '90%',
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
  satelliteName: {
    fontSize: 14,
    color: COLORS.muted,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    backgroundColor: COLORS.emerald + '20',
    borderColor: COLORS.emerald,
  },
  typeText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  typeTextActive: {
    color: COLORS.emerald,
    fontWeight: '500',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.emerald + '10',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.emerald,
    lineHeight: 18,
  },
  logButton: {
    backgroundColor: COLORS.emerald,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
```

**Step 2: Create AnomalyList component**

Create `components/satellite/AnomalyList.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SatelliteAnomaly } from '@/lib/supabase/types';
import { COLORS } from '@/lib/util/colors';

interface AnomalyListProps {
  anomalies: SatelliteAnomaly[];
  onDelete?: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#22c55e',
  moderate: '#fbbf24',
  severe: '#f59e0b',
  critical: '#dc2626',
};

const TYPE_ICONS: Record<string, string> = {
  safe_mode: 'shield-checkmark',
  reboot: 'refresh',
  sensor_error: 'thermometer',
  comm_loss: 'radio',
  attitude_error: 'compass',
  power_anomaly: 'battery-half',
  other: 'alert-circle',
};

export function AnomalyList({ anomalies, onDelete }: AnomalyListProps) {
  if (anomalies.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="checkmark-circle" size={32} color={COLORS.emerald} />
        <Text style={styles.emptyText}>No anomalies logged</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {anomalies.map((anomaly) => (
        <View key={anomaly.id} style={styles.card}>
          <View style={styles.header}>
            <Ionicons
              name={TYPE_ICONS[anomaly.anomaly_type] as any}
              size={20}
              color={SEVERITY_COLORS[anomaly.severity]}
            />
            <Text style={styles.type}>
              {anomaly.anomaly_type.replace('_', ' ')}
            </Text>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: SEVERITY_COLORS[anomaly.severity] + '20' },
              ]}
            >
              <Text
                style={[
                  styles.severityText,
                  { color: SEVERITY_COLORS[anomaly.severity] },
                ]}
              >
                {anomaly.severity}
              </Text>
            </View>
            {onDelete && (
              <Pressable onPress={() => onDelete(anomaly.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={COLORS.muted} />
              </Pressable>
            )}
          </View>

          <Text style={styles.date}>
            {new Date(anomaly.occurred_at).toLocaleString()}
          </Text>

          {anomaly.description && (
            <Text style={styles.description}>{anomaly.description}</Text>
          )}

          {/* Space weather correlation */}
          <View style={styles.correlation}>
            <Text style={styles.correlationTitle}>Space Weather at Time:</Text>
            <View style={styles.correlationData}>
              {anomaly.kp_at_time !== null && (
                <Text style={styles.correlationItem}>
                  Kp: {anomaly.kp_at_time.toFixed(1)}
                </Text>
              )}
              {anomaly.proton_flux_at_time !== null && (
                <Text style={styles.correlationItem}>
                  Protons: {anomaly.proton_flux_at_time.toExponential(1)} pfu
                </Text>
              )}
              {anomaly.electron_flux_at_time !== null && (
                <Text style={styles.correlationItem}>
                  Electrons: {anomaly.electron_flux_at_time.toExponential(1)}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  correlation: {
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 8,
  },
  correlationTitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  correlationData: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  correlationItem: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
});
```

**Step 3: Commit**

```bash
git add components/satellite/AnomalyLogger.tsx components/satellite/AnomalyList.tsx
git commit -m "feat: add anomaly logger with space weather correlation"
```

---

## Task 7: Create Satellite Dashboard Page

**Files:**
- Create: `app/satellite-dashboard.tsx`

**Step 1: Create satellite dashboard page**

Create `app/satellite-dashboard.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { ParticleFluxWidget } from '@/components/satellite/ParticleFluxWidget';
import { SatelliteCard } from '@/components/satellite/SatelliteCard';
import { AnomalyLogger } from '@/components/satellite/AnomalyLogger';
import { AnomalyList } from '@/components/satellite/AnomalyList';
import { useSatelliteStore, useOrbitRaisingSatellites } from '@/lib/state/useSatelliteStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { calculateFleetDragRisk } from '@/lib/services/dragRisk';
import { COLORS } from '@/lib/util/colors';

export default function SatelliteDashboardPage() {
  const router = useRouter();
  const { satellites, anomalies, selectedSatellite, fetchSatellites, selectSatellite, addAnomaly, deleteAnomaly } = useSatelliteStore();
  const orbitRaisingSats = useOrbitRaisingSatellites();
  const { kp } = useSolarStormStore();

  const [showAnomalyLogger, setShowAnomalyLogger] = useState(false);
  const [dragRisks, setDragRisks] = useState<ReturnType<typeof calculateFleetDragRisk>>([]);

  useEffect(() => {
    fetchSatellites();
  }, []);

  useEffect(() => {
    if (satellites.length > 0 && kp !== null) {
      setDragRisks(calculateFleetDragRisk(satellites, kp));
    }
  }, [satellites, kp]);

  const criticalRisks = dragRisks.filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high');

  return (
    <FeatureGate feature="satelliteRisk">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Satellite Operations</Text>
          <Pressable
            style={styles.manageButton}
            onPress={() => router.push('/satellites')}
          >
            <Text style={styles.manageButtonText}>Manage Fleet</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.emerald} />
          </Pressable>
        </View>

        {/* Particle Environment */}
        <ParticleFluxWidget />

        {/* Critical Alerts */}
        {criticalRisks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color="#dc2626" />
              <Text style={styles.sectionTitle}>Attention Required</Text>
            </View>
            {criticalRisks.map((risk) => (
              <View key={risk.satellite.id} style={styles.alertCard}>
                <Text style={styles.alertSatName}>{risk.satellite.name}</Text>
                <Text style={[styles.alertRisk, { color: risk.color }]}>
                  {risk.riskLevel.toUpperCase()} DRAG RISK
                </Text>
                <Text style={styles.alertRecommendation}>{risk.recommendation}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Orbit Raising Satellites */}
        {orbitRaisingSats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="rocket" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Orbit Raising ({orbitRaisingSats.length})</Text>
            </View>
            {orbitRaisingSats.map((sat) => (
              <SatelliteCard
                key={sat.id}
                satellite={sat}
                dragRisk={dragRisks.find((r) => r.satellite.id === sat.id)}
                onPress={() => selectSatellite(sat)}
              />
            ))}
          </View>
        )}

        {/* Selected Satellite Details */}
        {selectedSatellite && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="planet" size={20} color={COLORS.emerald} />
              <Text style={styles.sectionTitle}>{selectedSatellite.name}</Text>
              <Pressable onPress={() => selectSatellite(null)}>
                <Ionicons name="close" size={20} color={COLORS.muted} />
              </Pressable>
            </View>

            <Pressable
              style={styles.logAnomalyButton}
              onPress={() => setShowAnomalyLogger(true)}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.text} />
              <Text style={styles.logAnomalyText}>Log Anomaly</Text>
            </Pressable>

            <Text style={styles.anomalyHeader}>
              Anomaly History ({anomalies.length})
            </Text>
            <AnomalyList anomalies={anomalies} onDelete={deleteAnomaly} />
          </View>
        )}

        {/* Fleet Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fleet Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{satellites.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {satellites.filter((s) => s.orbit_type === 'LEO').length}
              </Text>
              <Text style={styles.summaryLabel}>LEO</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {satellites.filter((s) => s.orbit_type === 'GEO').length}
              </Text>
              <Text style={styles.summaryLabel}>GEO</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{orbitRaisingSats.length}</Text>
              <Text style={styles.summaryLabel}>Raising</Text>
            </View>
          </View>
        </View>

        <AnomalyLogger
          visible={showAnomalyLogger}
          satelliteId={selectedSatellite?.id || ''}
          satelliteName={selectedSatellite?.name || ''}
          onClose={() => setShowAnomalyLogger(false)}
          onLog={addAnomaly}
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
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageButtonText: {
    fontSize: 14,
    color: COLORS.emerald,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  alertCard: {
    backgroundColor: '#dc262610',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  alertSatName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  alertRisk: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  alertRecommendation: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  logAnomalyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  logAnomalyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  anomalyHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
});
```

**Step 2: Commit**

```bash
git add app/satellite-dashboard.tsx
git commit -m "feat: add satellite operations dashboard with risk alerts and anomaly tracking"
```

---

## Summary

Phase 2 delivers the core satellite operations features:

1. **Particle Flux Pipeline** - Proton and electron flux data from GOES
2. **S-Scale Classification** - Solar radiation storm severity (S0-S5)
3. **Surface Charging Risk** - GEO satellite charging assessment
4. **Satellite Fleet Manager** - CRUD operations with orbit type tracking
5. **Drag Risk Calculator** - LEO thermospheric density impact assessment
6. **Orbit Raising Mode** - Special monitoring for newly-launched satellites
7. **Anomaly Logger** - Record events with automatic space weather correlation
8. **CSV Fleet Import** - Bulk satellite management

**All features are Pro-tier gated** via the `satelliteRisk` feature flag.

**Next Steps (Phase 3 - GNSS):**
- Ionospheric TEC maps
- Scintillation forecasts
- GNSS error probability
- Multi-constellation status
- RTK/PPP degradation alerts

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

**Key dependencies:**
- Existing Supabase client
- Existing Zustand state management
- NOAA SWPC APIs (public, no key needed)
