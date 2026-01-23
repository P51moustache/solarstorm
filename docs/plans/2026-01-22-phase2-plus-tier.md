# Phase 2: Plus Tier Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the consumer "wow factor" features that justify the $9.99/month Plus tier - 3D globe, location predictions, HF propagation, and enhanced alerts.

**Architecture:** React Three Fiber for 3D globe rendering, OpenWeather API for cloud cover, Supabase Edge Functions for location-based aurora probability calculations. Feature-gated components from Phase 1.

**Tech Stack:** React Three Fiber, Three.js, @react-three/drei, OpenWeather API, Supabase Edge Functions, existing Zustand state

**Prerequisites:** Phase 1 must be complete (Supabase auth, Stripe subscriptions, feature gating)

---

## Task 1: Install 3D Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install React Three Fiber and dependencies**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm install three @react-three/fiber @react-three/drei
```

**Step 2: Install types**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm install -D @types/three
```

**Step 3: Verify installation**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm list three @react-three/fiber
```

Expected: Shows installed versions

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add React Three Fiber dependencies for 3D globe"
```

---

## Task 2: Create Basic Globe Component

**Files:**
- Create: `components/globe/Globe.tsx`
- Create: `components/globe/GlobeScene.tsx`
- Create: `components/globe/types.ts`

**Step 1: Create types file**

Create `components/globe/types.ts`:
```typescript
export interface GlobeProps {
  width: number;
  height: number;
  auroraData?: AuroraCell[];
  userLocation?: { lat: number; lng: number };
  onLocationSelect?: (lat: number, lng: number) => void;
}

export interface AuroraCell {
  lat: number;
  lng: number;
  probability: number; // 0-100
}

export interface GlobeControls {
  autoRotate: boolean;
  enableZoom: boolean;
  enablePan: boolean;
}
```

**Step 2: Create GlobeScene component**

Create `components/globe/GlobeScene.tsx`:
```typescript
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { AuroraCell } from './types';

interface GlobeSceneProps {
  auroraData?: AuroraCell[];
  autoRotate?: boolean;
}

export function GlobeScene({ auroraData = [], autoRotate = true }: GlobeSceneProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const auroraRef = useRef<THREE.Mesh>(null);

  // Rotate earth slowly
  useFrame((_, delta) => {
    if (autoRotate && earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05;
    }
    if (autoRotate && auroraRef.current) {
      auroraRef.current.rotation.y += delta * 0.05;
    }
  });

  // Create aurora oval geometry
  const auroraGeometry = useMemo(() => {
    if (auroraData.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    // Convert aurora cells to 3D points on sphere
    for (const cell of auroraData) {
      if (cell.probability < 10) continue; // Skip low probability

      const phi = (90 - cell.lat) * (Math.PI / 180);
      const theta = (cell.lng + 180) * (Math.PI / 180);
      const radius = 1.02; // Slightly above earth surface

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);

      // Color based on probability (green to red)
      const intensity = cell.probability / 100;
      colors.push(
        0.2 + intensity * 0.3, // R
        0.8 - intensity * 0.3, // G
        0.2,                    // B
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geometry;
  }, [auroraData]);

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.3} />

      {/* Sun light */}
      <directionalLight position={[5, 3, 5]} intensity={1} />

      {/* Stars background */}
      <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

      {/* Earth sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#1a4a7a"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Aurora overlay */}
      {auroraGeometry && (
        <points ref={auroraRef}>
          <bufferGeometry attach="geometry" {...auroraGeometry} />
          <pointsMaterial
            size={0.02}
            vertexColors
            transparent
            opacity={0.8}
            sizeAttenuation
          />
        </points>
      )}

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1.5}
        maxDistance={4}
        autoRotate={false}
      />
    </>
  );
}
```

**Step 3: Create main Globe component**

Create `components/globe/Globe.tsx`:
```typescript
import { Canvas } from '@react-three/fiber';
import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GlobeScene } from './GlobeScene';
import type { GlobeProps } from './types';

export function Globe({ width, height, auroraData, userLocation }: GlobeProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        style={{ width, height }}
      >
        <Suspense fallback={null}>
          <GlobeScene auroraData={auroraData} />
        </Suspense>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0B1020',
  },
});

// Export for lazy loading
export default Globe;
```

**Step 4: Commit**

```bash
git add components/globe/
git commit -m "feat: add basic 3D globe component with aurora visualization"
```

---

## Task 3: Create Globe Page with Feature Gate

**Files:**
- Create: `app/globe.tsx`
- Modify: `app/_layout.tsx`

**Step 1: Create globe page**

Create `app/globe.tsx`:
```typescript
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { Globe } from '@/components/globe/Globe';
import { useOvationStore } from '@/lib/state/useOvationStore';
import { COLORS } from '@/lib/util/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function GlobePage() {
  const { cells } = useOvationStore();

  // Transform OVATION data to aurora cells
  const auroraData = React.useMemo(() => {
    if (!cells || cells.length === 0) return [];

    return cells.map((cell) => ({
      lat: cell.lat,
      lng: cell.lng,
      probability: cell.aurora,
    }));
  }, [cells]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Aurora Globe</Text>
        <Text style={styles.subtitle}>Interactive 3D visualization</Text>
      </View>

      <FeatureGate feature="globe3d">
        <View style={styles.globeContainer}>
          <Globe
            width={screenWidth - 48}
            height={screenHeight * 0.6}
            auroraData={auroraData}
          />
        </View>
      </FeatureGate>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Aurora Probability</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Low (10-30%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
            <Text style={styles.legendText}>Medium (30-60%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>High (60%+)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
  globeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  legend: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
```

**Step 2: Add route to layout**

Add to `app/_layout.tsx` Stack:
```typescript
<Stack.Screen
  name="globe"
  options={{
    headerTitle: 'Aurora Globe',
    headerStyle: { backgroundColor: '#0B1020' },
    headerTintColor: '#E6ECFF',
  }}
/>
```

**Step 3: Create OVATION store if not exists**

Create `lib/state/useOvationStore.ts`:
```typescript
import { create } from 'zustand';
import { getOvation } from '../api/swpc';
import type { OvationCell } from '../api/parsers/ovation';

interface OvationState {
  cells: OvationCell[];
  updated: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useOvationStore = create<OvationState>((set) => ({
  cells: [],
  updated: null,
  isLoading: false,
  error: null,

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getOvation();
      set({
        cells: data.cells,
        updated: data.updated,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch aurora data',
        isLoading: false,
      });
    }
  },
}));
```

**Step 4: Run tests**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm test
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add app/globe.tsx app/_layout.tsx lib/state/useOvationStore.ts
git commit -m "feat: add globe page with feature gate for Plus tier"
```

---

## Task 4: Create Location Service and Store

**Files:**
- Create: `lib/services/location.ts`
- Create: `lib/state/useLocationStore.ts`
- Modify: `lib/supabase/types.ts`

**Step 1: Create location service**

Create `lib/services/location.ts`:
```typescript
import * as Location from 'expo-location';

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<UserCoordinates | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn('Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
    };
  } catch (error) {
    console.error('Failed to get location:', error);
    return null;
  }
}

export function calculateMagneticLatitude(lat: number, lng: number): number {
  // Simplified calculation using dipole approximation
  // Magnetic north pole approximately at 80.7°N, 72.7°W (2025 estimate)
  const magPoleLat = 80.7;
  const magPoleLng = -72.7;

  const latRad = lat * (Math.PI / 180);
  const lngRad = lng * (Math.PI / 180);
  const poleLatRad = magPoleLat * (Math.PI / 180);
  const poleLngRad = magPoleLng * (Math.PI / 180);

  // Spherical law of cosines for magnetic latitude
  const magLat = Math.asin(
    Math.sin(latRad) * Math.sin(poleLatRad) +
    Math.cos(latRad) * Math.cos(poleLatRad) * Math.cos(lngRad - poleLngRad)
  );

  return magLat * (180 / Math.PI);
}

export function getAuroraViewingLatitude(kp: number): number {
  // Approximate equatorward boundary of aurora for given Kp
  // Based on empirical data
  const boundaries: Record<number, number> = {
    0: 67,
    1: 65,
    2: 63,
    3: 60,
    4: 57,
    5: 53,
    6: 50,
    7: 47,
    8: 44,
    9: 40,
  };

  const floorKp = Math.floor(Math.min(9, Math.max(0, kp)));
  const ceilKp = Math.ceil(Math.min(9, Math.max(0, kp)));

  if (floorKp === ceilKp) return boundaries[floorKp];

  // Interpolate
  const fraction = kp - floorKp;
  return boundaries[floorKp] + (boundaries[ceilKp] - boundaries[floorKp]) * fraction;
}
```

**Step 2: Create location store**

Create `lib/state/useLocationStore.ts`:
```typescript
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../supabase/client';
import type { UserLocation } from '../supabase/types';
import { asyncStorage } from './persist';
import {
  calculateMagneticLatitude,
  getCurrentLocation,
  type UserCoordinates,
} from '../services/location';

interface LocationState {
  // Current device location
  currentLocation: UserCoordinates | null;
  magneticLatitude: number | null;

  // Saved locations (from Supabase)
  savedLocations: UserLocation[];
  primaryLocation: UserLocation | null;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCurrentLocation: () => Promise<void>;
  fetchSavedLocations: () => Promise<void>;
  addLocation: (label: string, lat: number, lng: number, isPrimary?: boolean) => Promise<void>;
  removeLocation: (id: string) => Promise<void>;
  setPrimaryLocation: (id: string) => Promise<void>;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      currentLocation: null,
      magneticLatitude: null,
      savedLocations: [],
      primaryLocation: null,
      isLoading: false,
      error: null,

      fetchCurrentLocation: async () => {
        set({ isLoading: true, error: null });
        try {
          const coords = await getCurrentLocation();
          if (coords) {
            const magLat = calculateMagneticLatitude(coords.lat, coords.lng);
            set({
              currentLocation: coords,
              magneticLatitude: magLat,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to get location',
            isLoading: false,
          });
        }
      },

      fetchSavedLocations: async () => {
        try {
          const { data, error } = await supabase
            .from('user_locations')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const locations = data || [];
          const primary = locations.find((l) => l.is_primary) || null;

          set({ savedLocations: locations, primaryLocation: primary });
        } catch (error) {
          console.error('Failed to fetch saved locations:', error);
        }
      },

      addLocation: async (label, lat, lng, isPrimary = false) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // If setting as primary, unset existing primary
          if (isPrimary) {
            await supabase
              .from('user_locations')
              .update({ is_primary: false })
              .eq('user_id', user.id)
              .eq('is_primary', true);
          }

          const { error } = await supabase
            .from('user_locations')
            .insert({
              user_id: user.id,
              label,
              lat,
              lng,
              is_primary: isPrimary,
            });

          if (error) throw error;

          await get().fetchSavedLocations();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add location',
            isLoading: false,
          });
        }
      },

      removeLocation: async (id) => {
        try {
          const { error } = await supabase
            .from('user_locations')
            .delete()
            .eq('id', id);

          if (error) throw error;

          await get().fetchSavedLocations();
        } catch (error) {
          console.error('Failed to remove location:', error);
        }
      },

      setPrimaryLocation: async (id) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // Unset existing primary
          await supabase
            .from('user_locations')
            .update({ is_primary: false })
            .eq('user_id', user.id)
            .eq('is_primary', true);

          // Set new primary
          const { error } = await supabase
            .from('user_locations')
            .update({ is_primary: true })
            .eq('id', id);

          if (error) throw error;

          await get().fetchSavedLocations();
        } catch (error) {
          console.error('Failed to set primary location:', error);
        }
      },
    }),
    {
      name: 'location-storage',
      storage: createJSONStorage(() => asyncStorage),
      partialize: (state) => ({
        currentLocation: state.currentLocation,
        magneticLatitude: state.magneticLatitude,
      }),
    }
  )
);
```

**Step 3: Commit**

```bash
git add lib/services/location.ts lib/state/useLocationStore.ts
git commit -m "feat: add location service with magnetic latitude calculation"
```

---

## Task 5: Create Aurora Probability Calculator

**Files:**
- Create: `lib/services/auroraProbability.ts`

**Step 1: Create aurora probability service**

Create `lib/services/auroraProbability.ts`:
```typescript
import { getAuroraViewingLatitude, calculateMagneticLatitude } from './location';

export interface AuroraPrediction {
  probability: number; // 0-100
  description: string;
  bestViewingTime: string | null;
  factors: {
    kp: { value: number; contribution: number };
    bz: { value: number; contribution: number };
    magneticLat: { value: number; contribution: number };
    speed: { value: number; contribution: number };
  };
}

export function calculateAuroraProbability(
  lat: number,
  lng: number,
  kp: number,
  bz: number,
  speed: number
): AuroraPrediction {
  const magLat = calculateMagneticLatitude(lat, lng);
  const absLat = Math.abs(magLat);
  const viewingLatitude = getAuroraViewingLatitude(kp);

  // Base probability from Kp index
  let kpContribution = 0;
  if (kp >= 7) kpContribution = 40;
  else if (kp >= 5) kpContribution = 30;
  else if (kp >= 4) kpContribution = 20;
  else if (kp >= 3) kpContribution = 10;
  else kpContribution = 5;

  // Bz contribution (southward is better)
  let bzContribution = 0;
  if (bz <= -10) bzContribution = 30;
  else if (bz <= -5) bzContribution = 20;
  else if (bz <= -2) bzContribution = 10;
  else if (bz < 0) bzContribution = 5;
  else bzContribution = 0;

  // Location contribution (closer to aurora oval = better)
  let latContribution = 0;
  const latDiff = absLat - viewingLatitude;
  if (latDiff >= 5) latContribution = 30; // Well inside oval
  else if (latDiff >= 0) latContribution = 25; // At edge
  else if (latDiff >= -5) latContribution = 15; // Just outside
  else if (latDiff >= -10) latContribution = 5; // Further out
  else latContribution = 0; // Too far south

  // Solar wind speed contribution
  let speedContribution = 0;
  if (speed >= 700) speedContribution = 15;
  else if (speed >= 500) speedContribution = 10;
  else if (speed >= 400) speedContribution = 5;
  else speedContribution = 0;

  // Calculate total probability
  const rawProbability = kpContribution + bzContribution + latContribution + speedContribution;
  const probability = Math.min(100, Math.max(0, rawProbability));

  // Generate description
  let description: string;
  if (probability >= 70) {
    description = 'Excellent conditions! Aurora likely visible at your location.';
  } else if (probability >= 50) {
    description = 'Good conditions. Aurora possible with clear skies.';
  } else if (probability >= 30) {
    description = 'Moderate conditions. Watch for activity increase.';
  } else if (probability >= 15) {
    description = 'Low probability. Aurora may be visible to the north.';
  } else {
    description = 'Unlikely at your latitude. Consider traveling north.';
  }

  // Best viewing time (simplified - local midnight in aurora zone)
  const bestViewingTime = probability >= 30 ? '10 PM - 2 AM local time' : null;

  return {
    probability,
    description,
    bestViewingTime,
    factors: {
      kp: { value: kp, contribution: kpContribution },
      bz: { value: bz, contribution: bzContribution },
      magneticLat: { value: absLat, contribution: latContribution },
      speed: { value: speed, contribution: speedContribution },
    },
  };
}
```

**Step 2: Commit**

```bash
git add lib/services/auroraProbability.ts
git commit -m "feat: add aurora probability calculator for location predictions"
```

---

## Task 6: Create Location-Based Prediction Component

**Files:**
- Create: `components/predictions/LocationPrediction.tsx`
- Create: `components/predictions/PredictionCard.tsx`

**Step 1: Create PredictionCard component**

Create `components/predictions/PredictionCard.tsx`:
```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/util/colors';

interface PredictionCardProps {
  label: string;
  probability: number;
  description: string;
  bestTime?: string | null;
}

export function PredictionCard({ label, probability, description, bestTime }: PredictionCardProps) {
  const probabilityColor =
    probability >= 70 ? '#22c55e' :
    probability >= 50 ? '#84cc16' :
    probability >= 30 ? '#eab308' :
    probability >= 15 ? '#f97316' :
    '#ef4444';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.probabilityBadge, { backgroundColor: probabilityColor + '20' }]}>
          <Text style={[styles.probabilityText, { color: probabilityColor }]}>
            {probability}%
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${probability}%`, backgroundColor: probabilityColor },
            ]}
          />
        </View>
      </View>

      <Text style={styles.description}>{description}</Text>

      {bestTime && (
        <View style={styles.bestTime}>
          <Text style={styles.bestTimeLabel}>Best viewing:</Text>
          <Text style={styles.bestTimeValue}>{bestTime}</Text>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  probabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  probabilityText: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  bestTime: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bestTimeLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginRight: 4,
  },
  bestTimeValue: {
    fontSize: 12,
    color: COLORS.emerald,
    fontWeight: '500',
  },
});
```

**Step 2: Create LocationPrediction component**

Create `components/predictions/LocationPrediction.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { calculateAuroraProbability } from '@/lib/services/auroraProbability';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS } from '@/lib/util/colors';
import { PredictionCard } from './PredictionCard';

export function LocationPrediction() {
  const { kp, bz, speed } = useSolarStormStore();
  const {
    currentLocation,
    savedLocations,
    primaryLocation,
    isLoading,
    fetchCurrentLocation,
    fetchSavedLocations,
  } = useLocationStore();

  useEffect(() => {
    fetchCurrentLocation();
    fetchSavedLocations();
  }, []);

  // Calculate prediction for current location
  const currentPrediction = useMemo(() => {
    if (!currentLocation || kp === null || bz === null || speed === null) return null;

    return calculateAuroraProbability(
      currentLocation.lat,
      currentLocation.lng,
      kp,
      bz,
      speed
    );
  }, [currentLocation, kp, bz, speed]);

  // Calculate predictions for saved locations
  const savedPredictions = useMemo(() => {
    if (kp === null || bz === null || speed === null) return [];

    return savedLocations.slice(0, 5).map((loc) => ({
      location: loc,
      prediction: calculateAuroraProbability(loc.lat, loc.lng, kp, bz, speed),
    }));
  }, [savedLocations, kp, bz, speed]);

  return (
    <FeatureGate feature="locationPredictions">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Location Predictions</Text>
          <Pressable onPress={fetchCurrentLocation} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.emerald} />
            ) : (
              <Ionicons name="refresh" size={20} color={COLORS.emerald} />
            )}
          </Pressable>
        </View>

        {/* Current location */}
        {currentPrediction && (
          <PredictionCard
            label="📍 Current Location"
            probability={currentPrediction.probability}
            description={currentPrediction.description}
            bestTime={currentPrediction.bestViewingTime}
          />
        )}

        {/* Primary saved location */}
        {primaryLocation && savedPredictions.find((p) => p.location.id === primaryLocation.id) && (
          <PredictionCard
            label={`⭐ ${primaryLocation.label}`}
            probability={savedPredictions.find((p) => p.location.id === primaryLocation.id)!.prediction.probability}
            description={savedPredictions.find((p) => p.location.id === primaryLocation.id)!.prediction.description}
            bestTime={savedPredictions.find((p) => p.location.id === primaryLocation.id)!.prediction.bestViewingTime}
          />
        )}

        {/* Other saved locations */}
        {savedPredictions
          .filter((p) => p.location.id !== primaryLocation?.id)
          .slice(0, 3)
          .map((item) => (
            <PredictionCard
              key={item.location.id}
              label={item.location.label}
              probability={item.prediction.probability}
              description={item.prediction.description}
              bestTime={item.prediction.bestViewingTime}
            />
          ))}

        {!currentLocation && !isLoading && savedLocations.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={32} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              Enable location access or add saved locations to see predictions
            </Text>
          </View>
        )}
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
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
    color: COLORS.muted,
    textAlign: 'center',
  },
});
```

**Step 3: Commit**

```bash
git add components/predictions/
git commit -m "feat: add location-based aurora prediction components"
```

---

## Task 7: Create Alert Configuration Store and UI

**Files:**
- Create: `lib/state/useAlertStore.ts`
- Create: `components/alerts/AlertConfig.tsx`

**Step 1: Create alert store**

Create `lib/state/useAlertStore.ts`:
```typescript
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../supabase/client';
import type { AlertConfig } from '../supabase/types';
import { asyncStorage } from './persist';

interface AlertState {
  config: AlertConfig | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<AlertConfig>) => Promise<void>;
  testAlert: () => Promise<void>;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      config: null,
      isLoading: false,
      error: null,

      fetchConfig: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('alert_configs')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') throw error;

          set({ config: data, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch alert config',
            isLoading: false,
          });
        }
      },

      updateConfig: async (updates) => {
        const { config } = get();
        if (!config) return;

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('alert_configs')
            .update(updates)
            .eq('id', config.id);

          if (error) throw error;

          set({
            config: { ...config, ...updates },
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update config',
            isLoading: false,
          });
        }
      },

      testAlert: async () => {
        // Send test notification
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          await supabase.functions.invoke('send-test-alert', {
            body: { userId: user.id },
          });
        } catch (error) {
          console.error('Failed to send test alert:', error);
        }
      },
    }),
    {
      name: 'alert-storage',
      storage: createJSONStorage(() => asyncStorage),
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);
```

**Step 2: Create AlertConfig component**

Create `components/alerts/AlertConfig.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { FeatureGate } from '@/components/FeatureGate';
import { useAlertStore } from '@/lib/state/useAlertStore';
import { useTier } from '@/hooks/useAuth';
import { TIER_FEATURES } from '@/lib/features/tiers';
import { COLORS } from '@/lib/util/colors';

export function AlertConfig() {
  const tier = useTier();
  const { config, isLoading, fetchConfig, updateConfig, testAlert } = useAlertStore();

  const [kpThreshold, setKpThreshold] = useState(5);
  const [bzThreshold, setBzThreshold] = useState(-5);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  const alertLimit = TIER_FEATURES[tier].alertsPerDay;
  const isUnlimited = alertLimit === Infinity;

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (config) {
      setKpThreshold(config.kp_threshold);
      setBzThreshold(config.bz_threshold ?? -5);
      setEmailEnabled(config.email_enabled);
      setPushEnabled(config.push_enabled);
    }
  }, [config]);

  const handleSave = async () => {
    await updateConfig({
      kp_threshold: kpThreshold,
      bz_threshold: bzThreshold,
      email_enabled: emailEnabled,
      push_enabled: pushEnabled,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alert Settings</Text>
        {!isUnlimited && (
          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>{alertLimit}/day limit</Text>
          </View>
        )}
      </View>

      {/* Kp Threshold */}
      <View style={styles.setting}>
        <View style={styles.settingHeader}>
          <Text style={styles.settingLabel}>Kp Threshold</Text>
          <Text style={styles.settingValue}>Kp ≥ {kpThreshold}</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={9}
          step={1}
          value={kpThreshold}
          onValueChange={setKpThreshold}
          onSlidingComplete={handleSave}
          minimumTrackTintColor={COLORS.emerald}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.emerald}
        />
        <Text style={styles.settingHint}>
          Alert when Kp index reaches this level
        </Text>
      </View>

      {/* Bz Threshold - Plus feature */}
      <FeatureGate feature="locationPredictions" showUpgrade={false}>
        <View style={styles.setting}>
          <View style={styles.settingHeader}>
            <Text style={styles.settingLabel}>Bz Threshold</Text>
            <Text style={styles.settingValue}>{bzThreshold} nT</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={-20}
            maximumValue={0}
            step={1}
            value={bzThreshold}
            onValueChange={setBzThreshold}
            onSlidingComplete={handleSave}
            minimumTrackTintColor={COLORS.bz.negative}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.bz.negative}
          />
          <Text style={styles.settingHint}>
            Also require Bz to drop below this value (southward)
          </Text>
        </View>
      </FeatureGate>

      {/* Notification channels */}
      <View style={styles.setting}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Email Notifications</Text>
            <Text style={styles.settingHint}>Receive alerts via email</Text>
          </View>
          <Switch
            value={emailEnabled}
            onValueChange={(value) => {
              setEmailEnabled(value);
              updateConfig({ email_enabled: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.emerald + '40' }}
            thumbColor={emailEnabled ? COLORS.emerald : COLORS.muted}
          />
        </View>
      </View>

      <View style={styles.setting}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingHint}>Receive alerts on this device</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={(value) => {
              setPushEnabled(value);
              updateConfig({ push_enabled: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.emerald + '40' }}
            thumbColor={pushEnabled ? COLORS.emerald : COLORS.muted}
          />
        </View>
      </View>

      {/* Test alert button */}
      <Pressable style={styles.testButton} onPress={testAlert}>
        <Ionicons name="notifications-outline" size={18} color={COLORS.text} />
        <Text style={styles.testButtonText}>Send Test Alert</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  limitBadge: {
    backgroundColor: COLORS.aurora.moderate + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  limitText: {
    fontSize: 12,
    color: COLORS.aurora.moderate,
    fontWeight: '500',
  },
  setting: {
    marginBottom: 20,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.emerald,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  settingHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
});
```

**Step 3: Install slider if needed**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm install @react-native-community/slider
```

**Step 4: Commit**

```bash
git add package.json package-lock.json lib/state/useAlertStore.ts components/alerts/
git commit -m "feat: add alert configuration store and UI with Plus tier features"
```

---

## Task 8: Create HF Propagation Component

**Files:**
- Create: `lib/api/parsers/xray.ts`
- Create: `lib/api/xray.ts`
- Create: `components/hf/HfPropagationMap.tsx`

**Step 1: Create X-ray parser**

Create `lib/api/parsers/xray.ts`:
```typescript
export interface XrayFlux {
  timestamp: string;
  shortWave: number; // 0.05-0.4 nm
  longWave: number;  // 0.1-0.8 nm
}

export interface RScaleLevel {
  scale: 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  description: string;
  hfImpact: string;
  color: string;
}

export function parseXrayData(data: unknown): XrayFlux | null {
  if (!Array.isArray(data) || data.length < 2) return null;

  // SWPC X-ray data format: [time_tag, satellite, current_class, ...]
  const latest = data[data.length - 1];

  if (!latest || typeof latest !== 'object') return null;

  return {
    timestamp: latest.time_tag || new Date().toISOString(),
    shortWave: parseFloat(latest.flux) || 0,
    longWave: parseFloat(latest.flux) || 0,
  };
}

export function getRadioBlackoutScale(flux: number): RScaleLevel {
  // Based on NOAA R-scale
  if (flux >= 1e-3) {
    return {
      scale: 'R5',
      description: 'Extreme',
      hfImpact: 'Complete HF blackout on daylit side for hours',
      color: '#dc2626',
    };
  } else if (flux >= 1e-4) {
    return {
      scale: 'R4',
      description: 'Severe',
      hfImpact: 'HF blackout on daylit side for 1-2 hours',
      color: '#ea580c',
    };
  } else if (flux >= 1e-5) {
    return {
      scale: 'R3',
      description: 'Strong',
      hfImpact: 'Wide area HF blackout for about an hour',
      color: '#f59e0b',
    };
  } else if (flux >= 1e-6) {
    return {
      scale: 'R2',
      description: 'Moderate',
      hfImpact: 'Limited HF blackout on sunlit side',
      color: '#fbbf24',
    };
  } else if (flux >= 1e-7) {
    return {
      scale: 'R1',
      description: 'Minor',
      hfImpact: 'Minor degradation of HF signals',
      color: '#84cc16',
    };
  }

  return {
    scale: 'R0',
    description: 'None',
    hfImpact: 'No impact on HF propagation',
    color: '#22c55e',
  };
}

export function getBandUsability(kp: number, rScale: RScaleLevel['scale']): Record<string, 'good' | 'fair' | 'poor'> {
  // Simplified HF band usability based on Kp and R-scale
  const rScaleImpact = ['R0', 'R1'].includes(rScale) ? 0 :
                       ['R2', 'R3'].includes(rScale) ? 1 : 2;

  const kpImpact = kp < 4 ? 0 : kp < 6 ? 1 : 2;

  const totalImpact = Math.max(rScaleImpact, kpImpact);

  if (totalImpact === 0) {
    return {
      '160m': 'good',
      '80m': 'good',
      '40m': 'good',
      '20m': 'good',
      '15m': 'fair',
      '10m': 'fair',
      '6m': 'poor',
    };
  } else if (totalImpact === 1) {
    return {
      '160m': 'fair',
      '80m': 'fair',
      '40m': 'good',
      '20m': 'fair',
      '15m': 'poor',
      '10m': 'poor',
      '6m': 'poor',
    };
  }

  return {
    '160m': 'poor',
    '80m': 'poor',
    '40m': 'fair',
    '20m': 'poor',
    '15m': 'poor',
    '10m': 'poor',
    '6m': 'poor',
  };
}
```

**Step 2: Create HF Propagation component**

Create `components/hf/HfPropagationMap.tsx`:
```typescript
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { getBandUsability, getRadioBlackoutScale, type RScaleLevel } from '@/lib/api/parsers/xray';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS } from '@/lib/util/colors';

const BANDS = ['160m', '80m', '40m', '20m', '15m', '10m', '6m'];

export function HfPropagationMap() {
  const { kp } = useSolarStormStore();

  // Mock X-ray flux for now (would come from API)
  const rScale: RScaleLevel = useMemo(() => {
    return getRadioBlackoutScale(1e-6); // Default to R1/R2 range
  }, []);

  const bandUsability = useMemo(() => {
    return getBandUsability(kp ?? 3, rScale.scale);
  }, [kp, rScale]);

  const getUsabilityColor = (status: 'good' | 'fair' | 'poor') => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'fair': return '#eab308';
      case 'poor': return '#ef4444';
    }
  };

  return (
    <FeatureGate feature="hfPropagation">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>HF Propagation</Text>
          <View style={[styles.rScaleBadge, { backgroundColor: rScale.color + '20' }]}>
            <Text style={[styles.rScaleText, { color: rScale.color }]}>
              {rScale.scale}
            </Text>
          </View>
        </View>

        <Text style={styles.rScaleDescription}>
          {rScale.description}: {rScale.hfImpact}
        </Text>

        <View style={styles.bandsGrid}>
          {BANDS.map((band) => (
            <View key={band} style={styles.bandItem}>
              <Text style={styles.bandLabel}>{band}</Text>
              <View
                style={[
                  styles.bandIndicator,
                  { backgroundColor: getUsabilityColor(bandUsability[band]) },
                ]}
              />
              <Text
                style={[
                  styles.bandStatus,
                  { color: getUsabilityColor(bandUsability[band]) },
                ]}
              >
                {bandUsability[band]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Good</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
            <Text style={styles.legendText}>Fair</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Poor</Text>
          </View>
        </View>
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  rScaleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rScaleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rScaleDescription: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  bandsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bandItem: {
    alignItems: 'center',
    flex: 1,
  },
  bandLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  bandIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  bandStatus: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
```

**Step 3: Commit**

```bash
git add lib/api/parsers/xray.ts components/hf/
git commit -m "feat: add HF propagation map component for ham radio operators"
```

---

## Task 9: Create Photo Planning Component

**Files:**
- Create: `lib/services/weather.ts`
- Create: `components/photo/PhotoPlanning.tsx`

**Step 1: Create weather service**

Create `lib/services/weather.ts`:
```typescript
import { fetchJson } from '../api/fetchJson';

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export interface WeatherData {
  cloudCover: number; // 0-100%
  visibility: number; // meters
  sunset: Date;
  sunrise: Date;
  moonPhase: number; // 0-1 (0 = new moon, 0.5 = full moon)
}

export async function getWeatherData(lat: number, lng: number): Promise<WeatherData | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeather API key not configured');
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&exclude=minutely,hourly,alerts&appid=${OPENWEATHER_API_KEY}`;
    const data = await fetchJson(url);

    return {
      cloudCover: data.current?.clouds ?? 0,
      visibility: data.current?.visibility ?? 10000,
      sunset: new Date(data.current?.sunset * 1000),
      sunrise: new Date(data.current?.sunrise * 1000),
      moonPhase: data.daily?.[0]?.moon_phase ?? 0,
    };
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    return null;
  }
}

export function getPhotoConditions(
  weather: WeatherData,
  auroraProbability: number
): {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  factors: Array<{ label: string; status: 'good' | 'fair' | 'poor'; note: string }>;
} {
  const factors = [];

  // Cloud cover
  if (weather.cloudCover < 20) {
    factors.push({ label: 'Sky', status: 'good' as const, note: 'Clear skies' });
  } else if (weather.cloudCover < 50) {
    factors.push({ label: 'Sky', status: 'fair' as const, note: 'Partly cloudy' });
  } else {
    factors.push({ label: 'Sky', status: 'poor' as const, note: 'Cloudy' });
  }

  // Moon phase
  const moonIllumination = Math.abs(weather.moonPhase - 0.5) * 2;
  if (moonIllumination > 0.7) {
    factors.push({ label: 'Moon', status: 'poor' as const, note: 'Bright moon' });
  } else if (moonIllumination > 0.3) {
    factors.push({ label: 'Moon', status: 'fair' as const, note: 'Partial moon' });
  } else {
    factors.push({ label: 'Moon', status: 'good' as const, note: 'Dark sky' });
  }

  // Aurora probability
  if (auroraProbability >= 50) {
    factors.push({ label: 'Aurora', status: 'good' as const, note: `${auroraProbability}% chance` });
  } else if (auroraProbability >= 25) {
    factors.push({ label: 'Aurora', status: 'fair' as const, note: `${auroraProbability}% chance` });
  } else {
    factors.push({ label: 'Aurora', status: 'poor' as const, note: `${auroraProbability}% chance` });
  }

  // Calculate overall
  const goodCount = factors.filter((f) => f.status === 'good').length;
  const poorCount = factors.filter((f) => f.status === 'poor').length;

  let overall: 'excellent' | 'good' | 'fair' | 'poor';
  if (goodCount === 3) overall = 'excellent';
  else if (goodCount >= 2 && poorCount === 0) overall = 'good';
  else if (poorCount >= 2) overall = 'poor';
  else overall = 'fair';

  return { overall, factors };
}
```

**Step 2: Create PhotoPlanning component**

Create `components/photo/PhotoPlanning.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { calculateAuroraProbability } from '@/lib/services/auroraProbability';
import { getPhotoConditions, getWeatherData, type WeatherData } from '@/lib/services/weather';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS } from '@/lib/util/colors';

export function PhotoPlanning() {
  const { currentLocation } = useLocationStore();
  const { kp, bz, speed } = useSolarStormStore();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentLocation) return;

    setIsLoading(true);
    getWeatherData(currentLocation.lat, currentLocation.lng)
      .then(setWeather)
      .finally(() => setIsLoading(false));
  }, [currentLocation]);

  const auroraProbability = React.useMemo(() => {
    if (!currentLocation || kp === null || bz === null || speed === null) return 0;

    const prediction = calculateAuroraProbability(
      currentLocation.lat,
      currentLocation.lng,
      kp,
      bz,
      speed
    );
    return prediction.probability;
  }, [currentLocation, kp, bz, speed]);

  const conditions = React.useMemo(() => {
    if (!weather) return null;
    return getPhotoConditions(weather, auroraProbability);
  }, [weather, auroraProbability]);

  const getStatusColor = (status: 'good' | 'fair' | 'poor') => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'fair': return '#eab308';
      case 'poor': return '#ef4444';
    }
  };

  const getOverallColor = (overall: string) => {
    switch (overall) {
      case 'excellent': return '#22c55e';
      case 'good': return '#84cc16';
      case 'fair': return '#eab308';
      default: return '#ef4444';
    }
  };

  return (
    <FeatureGate feature="photoPlanning">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="camera-outline" size={20} color={COLORS.emerald} />
            <Text style={styles.title}>Photo Planning</Text>
          </View>
          {isLoading && <ActivityIndicator size="small" color={COLORS.emerald} />}
        </View>

        {!currentLocation && (
          <Text style={styles.noLocation}>Enable location for photo planning</Text>
        )}

        {conditions && (
          <>
            <View style={[styles.overallBadge, { backgroundColor: getOverallColor(conditions.overall) + '20' }]}>
              <Text style={[styles.overallText, { color: getOverallColor(conditions.overall) }]}>
                {conditions.overall.charAt(0).toUpperCase() + conditions.overall.slice(1)} Conditions
              </Text>
            </View>

            <View style={styles.factors}>
              {conditions.factors.map((factor) => (
                <View key={factor.label} style={styles.factor}>
                  <View style={[styles.factorDot, { backgroundColor: getStatusColor(factor.status) }]} />
                  <View style={styles.factorContent}>
                    <Text style={styles.factorLabel}>{factor.label}</Text>
                    <Text style={styles.factorNote}>{factor.note}</Text>
                  </View>
                </View>
              ))}
            </View>

            {weather && (
              <View style={styles.timing}>
                <Text style={styles.timingLabel}>Best shooting window:</Text>
                <Text style={styles.timingValue}>
                  {weather.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                  {weather.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  noLocation: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  overallBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  overallText: {
    fontSize: 14,
    fontWeight: '600',
  },
  factors: {
    gap: 12,
  },
  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  factorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  factorContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  factorNote: {
    fontSize: 13,
    color: COLORS.muted,
  },
  timing: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timingLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  timingValue: {
    fontSize: 13,
    color: COLORS.emerald,
    fontWeight: '500',
  },
});
```

**Step 3: Commit**

```bash
git add lib/services/weather.ts components/photo/
git commit -m "feat: add photo planning component with weather integration"
```

---

## Task 10: Add Plus Features to Dashboard

**Files:**
- Modify: `app/dashboard.tsx` (or `app/index.tsx` if that's the dashboard)

**Step 1: Import new components**

Add to dashboard imports:
```typescript
import { LocationPrediction } from '@/components/predictions/LocationPrediction';
import { HfPropagationMap } from '@/components/hf/HfPropagationMap';
import { PhotoPlanning } from '@/components/photo/PhotoPlanning';
```

**Step 2: Add components to dashboard layout**

After the Aurora Heatmap section, add:
```typescript
{/* Plus Tier Features */}
<Section title="Your Aurora Forecast">
  <LocationPrediction />
</Section>

<Section>
  <HfPropagationMap />
</Section>

<Section>
  <PhotoPlanning />
</Section>
```

**Step 3: Add globe navigation button**

Add to header or as a card:
```typescript
<FeatureGate feature="globe3d" showUpgrade={true}>
  <Pressable
    style={styles.globeButton}
    onPress={() => router.push('/globe')}
  >
    <Ionicons name="globe-outline" size={24} color={COLORS.text} />
    <Text style={styles.globeButtonText}>View 3D Globe</Text>
  </Pressable>
</FeatureGate>
```

**Step 4: Run tests**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm test
```

Expected: All tests pass

**Step 5: Verify the app runs**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm run web
```

Expected: App loads with new Plus features (gated for free users)

**Step 6: Commit**

```bash
git add app/
git commit -m "feat: integrate Plus tier features into dashboard"
```

---

## Summary

Phase 2 delivers the consumer "wow factor":

1. **3D Globe** - React Three Fiber visualization of aurora oval
2. **Location Predictions** - Personalized probability based on coordinates and magnetic latitude
3. **Alert System** - Configurable Kp/Bz thresholds with unlimited alerts for Plus
4. **HF Propagation** - Band usability for ham radio operators
5. **Photo Planning** - Weather + aurora conditions for aurora photographers

**All features are gated** - Free users see upgrade prompts, Plus users get full access.

**Next Steps (Phase 3):**
- Satellite fleet manager
- Drag risk calculator
- API endpoints
- Power grid features (GIC, dB/dt)

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

**Key dependencies added:**
- `three`, `@react-three/fiber`, `@react-three/drei` - 3D rendering
- `@react-native-community/slider` - Alert threshold sliders
