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

## Task 8: TLE Import Service

**Goal:** Parse TLE (Two-Line Element) data from Space-Track.org or CelesTrak to auto-populate satellite orbital parameters.

**Files:**
- Create: `services/tle-parser.ts`
- Modify: `stores/satellite-store.ts`

**Step 1: Create TLE parser service**

```typescript
// services/tle-parser.ts
import { OrbitType } from '@/types/database';

export interface TLEData {
  name: string;
  noradId: number;
  inclination: number;      // degrees
  eccentricity: number;
  meanMotion: number;       // revs per day
  bstar: number;            // drag term (proxy for ballistic coefficient)
  epochYear: number;
  epochDay: number;
}

export interface ParsedOrbitalParams {
  noradId: number;
  altitudeKm: number;
  inclinationDeg: number;
  ballisticCoefficient: number;
  orbitType: OrbitType;
}

// Parse standard TLE format (two lines)
export function parseTLE(line1: string, line2: string): TLEData | null {
  try {
    // Line 1: NORAD ID at columns 3-7, epoch at 19-32, BSTAR at 54-61
    const noradId = parseInt(line1.substring(2, 7).trim(), 10);
    const epochYear = parseInt(line1.substring(18, 20).trim(), 10);
    const epochDay = parseFloat(line1.substring(20, 32).trim());

    // BSTAR is in format: ±NNNNN±N (mantissa + exponent)
    const bstarStr = line1.substring(53, 61).trim();
    const bstarMantissa = parseFloat(bstarStr.substring(0, 6)) / 100000;
    const bstarExp = parseInt(bstarStr.substring(6), 10);
    const bstar = bstarMantissa * Math.pow(10, bstarExp);

    // Line 2: inclination at 9-16, eccentricity at 27-33, mean motion at 53-63
    const inclination = parseFloat(line2.substring(8, 16).trim());
    const eccentricity = parseFloat('0.' + line2.substring(26, 33).trim());
    const meanMotion = parseFloat(line2.substring(52, 63).trim());

    return {
      name: '',
      noradId,
      inclination,
      eccentricity,
      meanMotion,
      bstar,
      epochYear: epochYear > 57 ? 1900 + epochYear : 2000 + epochYear,
      epochDay,
    };
  } catch {
    return null;
  }
}

// Calculate orbital parameters from TLE
export function calculateOrbitalParams(tle: TLEData): ParsedOrbitalParams {
  const GM = 398600.4418; // km³/s² - Earth gravitational parameter
  const EARTH_RADIUS = 6371; // km

  // Calculate semi-major axis from mean motion
  const meanMotionRadSec = (tle.meanMotion * 2 * Math.PI) / 86400;
  const semiMajorAxis = Math.pow(GM / (meanMotionRadSec * meanMotionRadSec), 1/3);

  // Altitude at perigee (lowest point)
  const perigee = semiMajorAxis * (1 - tle.eccentricity) - EARTH_RADIUS;
  const apogee = semiMajorAxis * (1 + tle.eccentricity) - EARTH_RADIUS;
  const avgAltitude = (perigee + apogee) / 2;

  // Determine orbit type
  let orbitType: OrbitType;
  if (avgAltitude < 2000) {
    orbitType = 'LEO';
  } else if (avgAltitude < 20000) {
    orbitType = 'MEO';
  } else if (avgAltitude >= 35000 && avgAltitude <= 36000 && tle.inclination < 5) {
    orbitType = 'GEO';
  } else {
    orbitType = 'HEO';
  }

  // Convert BSTAR to ballistic coefficient (simplified)
  // BSTAR = Cd * A / (2 * m) * rho0, where rho0 ≈ 2.461e-5 kg/m²/Earth radius
  const ballisticCoefficient = tle.bstar > 0 ? 1 / (tle.bstar * 12756.2) : 0;

  return {
    noradId: tle.noradId,
    altitudeKm: Math.round(avgAltitude),
    inclinationDeg: tle.inclination,
    ballisticCoefficient: Math.round(ballisticCoefficient * 100) / 100,
    orbitType,
  };
}

// Fetch TLE from CelesTrak by NORAD ID
export async function fetchTLEByNoradId(noradId: number): Promise<ParsedOrbitalParams | null> {
  try {
    const response = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`
    );

    if (!response.ok) return null;

    const text = await response.text();
    const lines = text.trim().split('\n');

    if (lines.length < 3) return null;

    // Format: Line 0 = name, Line 1 = TLE line 1, Line 2 = TLE line 2
    const tle = parseTLE(lines[1], lines[2]);
    if (!tle) return null;

    tle.name = lines[0].trim();
    return calculateOrbitalParams(tle);
  } catch {
    return null;
  }
}
```

**Step 2: Add TLE lookup to satellite store**

```typescript
// In stores/satellite-store.ts - add to SatelliteState interface:
  lookupNoradId: (noradId: number) => Promise<ParsedOrbitalParams | null>;

// Add implementation:
  lookupNoradId: async (noradId: number) => {
    const params = await fetchTLEByNoradId(noradId);
    return params;
  },
```

**Step 3: Test TLE parsing**

```bash
npm test -- --grep "TLE"
```

**Step 4: Commit**

```bash
git add services/tle-parser.ts stores/satellite-store.ts
git commit -m "feat: add TLE import service for NORAD ID lookup"
```

---

## Task 9: Maneuver Window Planner

**Goal:** Identify optimal windows for satellite maneuvers based on space weather conditions.

**Files:**
- Create: `services/maneuver-planner.ts`
- Create: `components/satellite/ManeuverPlanner.tsx`

**Step 1: Create maneuver planning service**

```typescript
// services/maneuver-planner.ts
import { OrbitType } from '@/types/database';

export interface ManeuverWindow {
  startTime: Date;
  endTime: Date;
  quality: 'optimal' | 'acceptable' | 'risky';
  risks: string[];
  kpForecast: number;
  protonFluxForecast: number;
}

export interface ManeuverConstraints {
  orbitType: OrbitType;
  isOrbitRaising: boolean;
  requiresLowDrag: boolean;      // For LEO orbit raising
  requiresLowRadiation: boolean; // For MEO through Van Allen
  maxKp: number;
  maxProtonFlux: number;
}

const DEFAULT_CONSTRAINTS: Record<OrbitType, Partial<ManeuverConstraints>> = {
  LEO: { maxKp: 5, maxProtonFlux: 100, requiresLowDrag: true },
  MEO: { maxKp: 4, maxProtonFlux: 10, requiresLowRadiation: true },
  GEO: { maxKp: 4, maxProtonFlux: 100 },
  HEO: { maxKp: 3, maxProtonFlux: 10, requiresLowRadiation: true },
};

export function getDefaultConstraints(orbitType: OrbitType): ManeuverConstraints {
  return {
    orbitType,
    isOrbitRaising: false,
    requiresLowDrag: false,
    requiresLowRadiation: false,
    maxKp: 5,
    maxProtonFlux: 100,
    ...DEFAULT_CONSTRAINTS[orbitType],
  };
}

export function evaluateManeuverWindow(
  kp: number,
  protonFlux: number,
  electronFlux: number,
  constraints: ManeuverConstraints
): { quality: ManeuverWindow['quality']; risks: string[] } {
  const risks: string[] = [];

  if (kp > constraints.maxKp) {
    risks.push(`Kp ${kp} exceeds limit ${constraints.maxKp}`);
  }
  if (protonFlux > constraints.maxProtonFlux) {
    risks.push(`Proton flux ${protonFlux} exceeds limit ${constraints.maxProtonFlux}`);
  }
  if (constraints.requiresLowDrag && kp > 4) {
    risks.push('High atmospheric drag from geomagnetic activity');
  }
  if (constraints.requiresLowRadiation && protonFlux > 10) {
    risks.push('Elevated radiation in Van Allen belt region');
  }
  if (electronFlux > 1e4) {
    risks.push('Surface charging risk from electron flux');
  }

  let quality: ManeuverWindow['quality'];
  if (risks.length === 0 && kp <= 3 && protonFlux <= 10) {
    quality = 'optimal';
  } else if (risks.length === 0) {
    quality = 'acceptable';
  } else {
    quality = 'risky';
  }

  return { quality, risks };
}
```

**Step 2: Commit**

```bash
git add services/maneuver-planner.ts
git commit -m "feat: add maneuver window planning service"
```

---

## Task 10: MEO Radiation Belt Risk

**Goal:** Assess Van Allen radiation belt risk for MEO satellites and orbit-raising maneuvers.

**Files:**
- Create: `services/radiation-belt.ts`
- Create: `components/satellite/RadiationBeltRisk.tsx`

**Step 1: Create radiation belt service**

```typescript
// services/radiation-belt.ts
export interface RadiationBeltRisk {
  level: 'low' | 'moderate' | 'high' | 'severe';
  innerBeltFlux: number;  // Protons
  outerBeltFlux: number;  // Electrons
  slotRegionSafe: boolean;
  recommendations: string[];
}

// Van Allen belt boundaries (approximate)
const INNER_BELT_MIN = 1000;   // km
const INNER_BELT_MAX = 6000;   // km
const SLOT_REGION_MIN = 6000;  // km
const SLOT_REGION_MAX = 13000; // km
const OUTER_BELT_MIN = 13000;  // km
const OUTER_BELT_MAX = 40000;  // km

export function isInRadiationBelt(altitudeKm: number): {
  inInnerBelt: boolean;
  inSlotRegion: boolean;
  inOuterBelt: boolean;
} {
  return {
    inInnerBelt: altitudeKm >= INNER_BELT_MIN && altitudeKm <= INNER_BELT_MAX,
    inSlotRegion: altitudeKm >= SLOT_REGION_MIN && altitudeKm <= SLOT_REGION_MAX,
    inOuterBelt: altitudeKm >= OUTER_BELT_MIN && altitudeKm <= OUTER_BELT_MAX,
  };
}

export function assessRadiationBeltRisk(
  altitudeKm: number,
  protonFlux: number,
  electronFlux: number,
  kp: number
): RadiationBeltRisk {
  const location = isInRadiationBelt(altitudeKm);
  const recommendations: string[] = [];

  // During storms, outer belt expands and slot region fills
  const slotRegionSafe = kp < 5 && location.inSlotRegion;

  let level: RadiationBeltRisk['level'] = 'low';

  if (location.inInnerBelt) {
    // Inner belt is relatively stable but high proton flux
    if (protonFlux > 100) {
      level = 'severe';
      recommendations.push('Minimize time in inner belt during SPE');
    } else if (protonFlux > 10) {
      level = 'high';
      recommendations.push('Monitor proton flux closely');
    } else {
      level = 'moderate';
    }
  } else if (location.inOuterBelt) {
    // Outer belt varies dramatically with geomagnetic activity
    if (kp >= 7 || electronFlux > 1e5) {
      level = 'severe';
      recommendations.push('Outer belt highly enhanced - delay transit if possible');
    } else if (kp >= 5 || electronFlux > 1e4) {
      level = 'high';
      recommendations.push('Elevated electron flux in outer belt');
    } else if (electronFlux > 1e3) {
      level = 'moderate';
    }
  } else if (location.inSlotRegion) {
    // Slot region normally safe but fills during storms
    if (kp >= 6) {
      level = 'high';
      recommendations.push('Slot region filling with particles during storm');
    } else if (kp >= 4) {
      level = 'moderate';
      recommendations.push('Monitor slot region conditions');
    }
  }

  return {
    level,
    innerBeltFlux: protonFlux,
    outerBeltFlux: electronFlux,
    slotRegionSafe,
    recommendations,
  };
}
```

**Step 2: Commit**

```bash
git add services/radiation-belt.ts
git commit -m "feat: add Van Allen radiation belt risk assessment"
```

---

## Task 11: Launch Window Assessment

**Goal:** Evaluate space weather conditions for launch windows, especially for orbit-raising phases.

**Files:**
- Create: `services/launch-assessment.ts`

**Step 1: Create launch assessment service**

```typescript
// services/launch-assessment.ts
import { assessRadiationBeltRisk } from './radiation-belt';

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
    value: kp.toString(),
    threshold: '< 5 green, < 7 yellow',
  });

  // Proton flux (SPE) assessment
  let protonStatus: 'green' | 'yellow' | 'red' = 'green';
  if (protonFlux >= 100) protonStatus = 'red';
  else if (protonFlux >= 10) protonStatus = 'yellow';
  factors.push({
    name: 'Solar Proton Event',
    status: protonStatus,
    value: `${protonFlux} pfu`,
    threshold: '< 10 green, < 100 yellow',
  });

  // Solar wind assessment
  let windStatus: 'green' | 'yellow' | 'red' = 'green';
  if (solarWindSpeed >= 700) windStatus = 'red';
  else if (solarWindSpeed >= 500) windStatus = 'yellow';
  factors.push({
    name: 'Solar Wind Speed',
    status: windStatus,
    value: `${solarWindSpeed} km/s`,
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
    } else if (radiationRisk.level === 'moderate') {
      orbitRaisingRisk = 'Moderate';
    }
  }

  // LEO drag during orbit raising
  if (targetAltitude < 600 && kp >= 5) {
    recommendations.push('Elevated atmospheric drag - may affect orbit raising fuel budget');
  }

  // Overall assessment
  const hasRed = factors.some(f => f.status === 'red');
  const hasYellow = factors.some(f => f.status === 'yellow');

  let overall: LaunchWindowAssessment['overall'];
  if (hasRed) {
    overall = 'no-go';
  } else if (hasYellow) {
    overall = 'caution';
  } else {
    overall = 'go';
  }

  return { overall, factors, orbitRaisingRisk, recommendations };
}
```

**Step 2: Commit**

```bash
git add services/launch-assessment.ts
git commit -m "feat: add launch window space weather assessment"
```

---

## Task 12: Storm Replay & Correlation

**Goal:** Replay historical storm data and correlate with logged anomalies to identify patterns.

**Files:**
- Create: `services/storm-correlation.ts`
- Create: `components/satellite/StormReplay.tsx`

**Step 1: Create storm correlation service**

```typescript
// services/storm-correlation.ts
import { supabase } from '@/lib/supabase';
import { SatelliteAnomaly } from '@/types/database';

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
  return data || [];
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
  const ratio = correlatedAnomalies.length / Math.max(anomalies.length, 1);

  if (correlatedAnomalies.length >= 3 && ratio > 0.5) {
    strength = 'strong';
  } else if (correlatedAnomalies.length >= 2 && ratio > 0.3) {
    strength = 'moderate';
  } else if (correlatedAnomalies.length >= 1) {
    strength = 'weak';
  } else {
    strength = 'none';
  }

  return {
    stormEvent: storm,
    anomalies: correlatedAnomalies,
    correlationStrength: strength,
    delayHours: Math.round(avgDelay * 10) / 10,
  };
}

// Get historical Kp data to identify storm periods
export async function fetchHistoricalStorms(
  startDate: Date,
  endDate: Date
): Promise<StormEvent[]> {
  // Query proton flux history for SPEs (S-scale storms)
  const { data: protonData } = await supabase
    .from('proton_flux_history')
    .select('*')
    .gte('recorded_at', startDate.toISOString())
    .lte('recorded_at', endDate.toISOString())
    .gte('flux_pfu', 10) // S1 threshold
    .order('recorded_at', { ascending: true });

  const storms: StormEvent[] = [];

  // Group consecutive high-flux periods into storm events
  if (protonData && protonData.length > 0) {
    let currentStorm: Partial<StormEvent> | null = null;
    let peakFlux = 0;

    for (const reading of protonData) {
      const time = new Date(reading.recorded_at);

      if (!currentStorm) {
        currentStorm = {
          startTime: time,
          peakTime: time,
          peakProtonFlux: reading.flux_pfu,
          peakKp: 0,
        };
        peakFlux = reading.flux_pfu;
      } else {
        // Check if this is part of same storm (within 6 hours)
        const lastTime = currentStorm.peakTime!.getTime();
        if (time.getTime() - lastTime < 6 * 60 * 60 * 1000) {
          if (reading.flux_pfu > peakFlux) {
            peakFlux = reading.flux_pfu;
            currentStorm.peakTime = time;
            currentStorm.peakProtonFlux = reading.flux_pfu;
          }
        } else {
          // End current storm, start new one
          currentStorm.endTime = new Date(lastTime + 60 * 60 * 1000);
          currentStorm.classification = classifyProtonStorm(peakFlux);
          storms.push(currentStorm as StormEvent);

          currentStorm = {
            startTime: time,
            peakTime: time,
            peakProtonFlux: reading.flux_pfu,
            peakKp: 0,
          };
          peakFlux = reading.flux_pfu;
        }
      }
    }

    // Close final storm
    if (currentStorm) {
      currentStorm.endTime = currentStorm.peakTime;
      currentStorm.classification = classifyProtonStorm(peakFlux);
      storms.push(currentStorm as StormEvent);
    }
  }

  return storms;
}

function classifyProtonStorm(flux: number): string {
  if (flux >= 100000) return 'S5';
  if (flux >= 10000) return 'S4';
  if (flux >= 1000) return 'S3';
  if (flux >= 100) return 'S2';
  if (flux >= 10) return 'S1';
  return 'S0';
}
```

**Step 2: Commit**

```bash
git add services/storm-correlation.ts
git commit -m "feat: add storm replay and anomaly correlation service"
```

---

## Task 13: REST API & CSV Export

**Goal:** Provide programmatic API access and data export for Pro tier users.

**Files:**
- Create: `supabase/functions/api-satellites/index.ts`
- Create: `supabase/functions/api-gnss/index.ts`
- Create: `services/data-export.ts`

**Step 1: Create satellite API endpoint**

```typescript
// supabase/functions/api-satellites/index.ts
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
  const format = url.searchParams.get('format') || 'json';

  // Get user's satellites with current risk assessment
  const { data: satellites, error } = await supabase
    .from('satellites')
    .select('*')
    .eq('user_id', profile.id);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (format === 'csv') {
    const csv = convertToCSV(satellites);
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="satellites.csv"',
      },
    });
  }

  return new Response(
    JSON.stringify({ satellites, count: satellites.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
```

**Step 2: Commit**

```bash
git add supabase/functions/api-satellites/index.ts
git commit -m "feat: add REST API endpoint for satellite data with CSV export"
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
8. **TLE Import** - NORAD ID lookup via CelesTrak for orbital parameters
9. **Maneuver Window Planner** - Optimal windows based on space weather
10. **MEO Radiation Belt Risk** - Van Allen belt assessment
11. **Launch Window Assessment** - Space weather go/no-go evaluation
12. **Storm Replay & Correlation** - Historical analysis of anomaly patterns
13. **REST API & CSV Export** - Programmatic data access for Pro users

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
