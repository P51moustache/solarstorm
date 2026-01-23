# Phase 4: Plus Tier Features Implementation Plan (Nice-to-Have)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build consumer "wow factor" features for the Plus tier - 3D globe, aurora predictions, HF propagation. These are nice-to-have after satellite ops and GNSS are complete.

**Architecture:** React Three Fiber for 3D globe rendering, OpenWeather API for cloud cover, Supabase Edge Functions for location-based aurora probability calculations. Feature-gated components from Phase 1.

**Tech Stack:** React Three Fiber, Three.js, @react-three/drei, OpenWeather API, Supabase Edge Functions, existing Zustand state

**Prerequisites:** Phase 1 (foundation), Phase 2 (satellite ops), Phase 3 (GNSS) should be complete first

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
import { useFrame, useLoader } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { AuroraCell } from './types';

// NASA Blue Marble Earth texture URL (public domain)
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg';
const EARTH_NIGHT_URL = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-night.jpg';

interface GlobeSceneProps {
  auroraData?: AuroraCell[];
  autoRotate?: boolean;
}

export function GlobeScene({ auroraData = [], autoRotate = true }: GlobeSceneProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const auroraRef = useRef<THREE.Mesh>(null);

  // Load Earth textures
  const [dayTexture, nightTexture] = useTexture([EARTH_TEXTURE_URL, EARTH_NIGHT_URL]);

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

      {/* Earth sphere with photorealistic texture */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={dayTexture}
          emissiveMap={nightTexture}
          emissive={new THREE.Color(0x112244)}
          emissiveIntensity={0.5}
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
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { FeatureGate } from '@/components/FeatureGate';
import { useAlertStore } from '@/lib/state/useAlertStore';
import { useTier } from '@/hooks/useAuth';
import { TIER_FEATURES } from '@/lib/features/tiers';
import { COLORS } from '@/lib/util/colors';

// Helper to convert "HH:mm" string to Date
function timeStringToDate(timeStr: string | null): Date {
  const now = new Date();
  if (!timeStr) return now;
  const [hours, minutes] = timeStr.split(':').map(Number);
  now.setHours(hours, minutes, 0, 0);
  return now;
}

// Helper to format Date to "HH:mm" string
function dateToTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function AlertConfig() {
  const tier = useTier();
  const { config, isLoading, fetchConfig, updateConfig, testAlert } = useAlertStore();

  const [kpThreshold, setKpThreshold] = useState(5);
  const [bzThreshold, setBzThreshold] = useState(-5);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState(new Date());
  const [quietEnd, setQuietEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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
      setQuietHoursEnabled(!!config.quiet_start);
      setQuietStart(timeStringToDate(config.quiet_start));
      setQuietEnd(timeStringToDate(config.quiet_end));
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

      {/* Quiet Hours - Plus feature */}
      <FeatureGate feature="locationPredictions" showUpgrade={false}>
        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Quiet Hours</Text>
              <Text style={styles.settingHint}>Silence alerts during these times</Text>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={(value) => {
                setQuietHoursEnabled(value);
                if (!value) {
                  updateConfig({ quiet_start: null, quiet_end: null });
                } else {
                  updateConfig({
                    quiet_start: dateToTimeString(quietStart),
                    quiet_end: dateToTimeString(quietEnd),
                  });
                }
              }}
              trackColor={{ false: COLORS.border, true: COLORS.emerald + '40' }}
              thumbColor={quietHoursEnabled ? COLORS.emerald : COLORS.muted}
            />
          </View>

          {quietHoursEnabled && (
            <View style={styles.quietTimeRow}>
              <Pressable
                style={styles.timeButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="moon-outline" size={16} color={COLORS.muted} />
                <Text style={styles.timeButtonText}>
                  Start: {dateToTimeString(quietStart)}
                </Text>
              </Pressable>

              <Text style={styles.timeSeparator}>to</Text>

              <Pressable
                style={styles.timeButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="sunny-outline" size={16} color={COLORS.muted} />
                <Text style={styles.timeButtonText}>
                  End: {dateToTimeString(quietEnd)}
                </Text>
              </Pressable>
            </View>
          )}

          {showStartPicker && (
            <DateTimePicker
              value={quietStart}
              mode="time"
              is24Hour={true}
              onChange={(event, date) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (date) {
                  setQuietStart(date);
                  updateConfig({ quiet_start: dateToTimeString(date) });
                }
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={quietEnd}
              mode="time"
              is24Hour={true}
              onChange={(event, date) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (date) {
                  setQuietEnd(date);
                  updateConfig({ quiet_end: dateToTimeString(date) });
                }
              }}
            />
          )}
        </View>
      </FeatureGate>

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
  quietTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  timeSeparator: {
    fontSize: 14,
    color: COLORS.muted,
  },
});
```

**Step 3: Install dependencies**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm install @react-native-community/slider @react-native-community/datetimepicker
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

## Task 11: Solar Flux Index (SFI/F10.7) Trends Chart

**Files:**
- Create: `lib/api/parsers/solarFlux.ts`
- Create: `lib/api/solarFlux.ts`
- Create: `components/charts/SfiTrendChart.tsx`

**Step 1: Create solar flux parser**

Create `lib/api/parsers/solarFlux.ts`:
```typescript
export interface SolarFluxData {
  timestamp: string;
  f107: number; // 10.7 cm radio flux (solar flux units, sfu)
  sunspotNumber?: number;
}

export interface SfiTrend {
  current: number;
  trend: 'rising' | 'falling' | 'stable';
  average30day: number;
  history: SolarFluxData[];
}

// SWPC F10.7 data endpoint
const SFI_ENDPOINT = 'https://services.swpc.noaa.gov/json/f107_cm_flux.json';

export function parseSolarFluxData(data: unknown): SolarFluxData[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object'
    )
    .map((item) => ({
      timestamp: String(item.time_tag || ''),
      f107: parseFloat(String(item.flux || '0')),
    }))
    .filter((item) => item.f107 > 0);
}

export function calculateSfiTrend(data: SolarFluxData[]): SfiTrend | null {
  if (data.length < 2) return null;

  const sorted = [...data].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const current = sorted[0].f107;
  const previous = sorted[1].f107;
  const last30 = sorted.slice(0, 30);
  const average30day = last30.reduce((sum, d) => sum + d.f107, 0) / last30.length;

  let trend: 'rising' | 'falling' | 'stable';
  const diff = current - previous;
  if (diff > 5) trend = 'rising';
  else if (diff < -5) trend = 'falling';
  else trend = 'stable';

  return {
    current,
    trend,
    average30day: Math.round(average30day),
    history: sorted.slice(0, 90), // Last 90 days
  };
}

export function getSfiCondition(f107: number): {
  label: string;
  color: string;
  hfImpact: string;
} {
  if (f107 >= 150) {
    return {
      label: 'High',
      color: '#22c55e',
      hfImpact: 'Excellent HF propagation, 10m/6m openings likely',
    };
  } else if (f107 >= 100) {
    return {
      label: 'Moderate',
      color: '#eab308',
      hfImpact: 'Good HF propagation, higher bands improving',
    };
  } else if (f107 >= 70) {
    return {
      label: 'Low',
      color: '#f97316',
      hfImpact: 'Fair HF propagation, focus on lower bands',
    };
  }
  return {
    label: 'Very Low',
    color: '#ef4444',
    hfImpact: 'Poor HF propagation, solar minimum conditions',
  };
}
```

**Step 2: Create SFI API function**

Create `lib/api/solarFlux.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayjs } from '../util/time';
import { fetchJson } from './fetchJson';
import { calculateSfiTrend, parseSolarFluxData, type SfiTrend } from './parsers/solarFlux';

const CACHE_KEY = 'sfi:trend';
const CACHE_TTL = 60; // 1 hour

export async function getSfiTrend(): Promise<SfiTrend | null> {
  // Check cache
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = dayjs().diff(dayjs(timestamp), 'minute');
      if (age <= CACHE_TTL) return data;
    }
  } catch (e) {
    console.error('Cache read error:', e);
  }

  // Fetch fresh data
  try {
    const raw = await fetchJson('https://services.swpc.noaa.gov/json/f107_cm_flux.json');
    const parsed = parseSolarFluxData(raw);
    const trend = calculateSfiTrend(parsed);

    if (trend) {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: trend, timestamp: new Date().toISOString() })
      );
    }

    return trend;
  } catch (error) {
    console.error('Failed to fetch SFI data:', error);
    return null;
  }
}
```

**Step 3: Create SFI Trend Chart component**

Create `components/charts/SfiTrendChart.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { getSfiTrend } from '@/lib/api/solarFlux';
import { getSfiCondition, type SfiTrend } from '@/lib/api/parsers/solarFlux';
import { COLORS } from '@/lib/util/colors';

const { width: screenWidth } = Dimensions.get('window');

export function SfiTrendChart() {
  const [trend, setTrend] = useState<SfiTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSfiTrend()
      .then(setTrend)
      .finally(() => setIsLoading(false));
  }, []);

  const condition = trend ? getSfiCondition(trend.current) : null;

  const getTrendIcon = () => {
    if (!trend) return 'remove-outline';
    switch (trend.trend) {
      case 'rising': return 'trending-up';
      case 'falling': return 'trending-down';
      default: return 'remove-outline';
    }
  };

  return (
    <FeatureGate feature="hfPropagation">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Solar Flux Index (F10.7)</Text>
          {isLoading && <ActivityIndicator size="small" color={COLORS.emerald} />}
        </View>

        {trend && condition && (
          <>
            <View style={styles.currentValue}>
              <Text style={styles.valueNumber}>{Math.round(trend.current)}</Text>
              <Text style={styles.valueUnit}>sfu</Text>
              <Ionicons
                name={getTrendIcon() as any}
                size={24}
                color={trend.trend === 'rising' ? '#22c55e' : trend.trend === 'falling' ? '#ef4444' : COLORS.muted}
              />
            </View>

            <View style={[styles.conditionBadge, { backgroundColor: condition.color + '20' }]}>
              <Text style={[styles.conditionText, { color: condition.color }]}>
                {condition.label}
              </Text>
            </View>

            <Text style={styles.impact}>{condition.hfImpact}</Text>

            {/* Simple sparkline visualization */}
            <View style={styles.chartContainer}>
              <View style={styles.chartBars}>
                {trend.history.slice(0, 30).reverse().map((d, i) => (
                  <View
                    key={i}
                    style={[
                      styles.chartBar,
                      {
                        height: Math.max(4, (d.f107 / 200) * 60),
                        backgroundColor: d.f107 >= 100 ? '#22c55e' : d.f107 >= 70 ? '#eab308' : '#f97316',
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabel}>30 days ago</Text>
                <Text style={styles.chartLabel}>Today</Text>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>30-day avg</Text>
                <Text style={styles.statValue}>{trend.average30day} sfu</Text>
              </View>
            </View>
          </>
        )}

        {!isLoading && !trend && (
          <Text style={styles.error}>Unable to load solar flux data</Text>
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  currentValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  valueNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
  },
  valueUnit: {
    fontSize: 16,
    color: COLORS.muted,
    marginRight: 8,
  },
  conditionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  impact: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 12,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 2,
  },
  chartBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: COLORS.muted,
  },
  stats: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  error: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    padding: 16,
  },
});
```

**Step 4: Commit**

```bash
git add lib/api/parsers/solarFlux.ts lib/api/solarFlux.ts components/charts/SfiTrendChart.tsx
git commit -m "feat: add Solar Flux Index (F10.7) trends chart for ham radio"
```

---

## Task 12: CME Countdown Widget

**Files:**
- Create: `lib/api/parsers/cme.ts`
- Create: `lib/api/cme.ts`
- Create: `components/widgets/CmeCountdown.tsx`

**Step 1: Create CME parser**

Create `lib/api/parsers/cme.ts`:
```typescript
export interface CmeEvent {
  id: string;
  startTime: string;
  arrivalTime: string | null; // Predicted Earth arrival
  speed: number; // km/s
  halfAngle: number;
  isEarthDirected: boolean;
  note: string;
}

export interface CmeCountdownData {
  nextArrival: CmeEvent | null;
  recentCmes: CmeEvent[];
  hoursUntilArrival: number | null;
}

// NASA DONKI CME endpoint
const DONKI_CME_ENDPOINT = 'https://api.nasa.gov/DONKI/CME';

export function parseCmeData(data: unknown): CmeEvent[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object'
    )
    .map((item) => {
      // Find Earth-directed analysis
      const analyses = Array.isArray(item.cmeAnalyses) ? item.cmeAnalyses : [];
      const earthAnalysis = analyses.find(
        (a: any) => a.isMostAccurate && a.enlilList?.some((e: any) => e.isEarthGB)
      );
      const enlil = earthAnalysis?.enlilList?.find((e: any) => e.isEarthGB);

      return {
        id: String(item.activityID || ''),
        startTime: String(item.startTime || ''),
        arrivalTime: enlil?.arrivalTime || null,
        speed: earthAnalysis?.speed || 0,
        halfAngle: earthAnalysis?.halfAngle || 0,
        isEarthDirected: !!enlil,
        note: String(item.note || ''),
      };
    })
    .filter((cme) => cme.id && cme.startTime);
}

export function getNextCmeArrival(cmes: CmeEvent[]): CmeCountdownData {
  const now = new Date();

  // Filter to Earth-directed CMEs with future arrival times
  const upcoming = cmes
    .filter((cme) => {
      if (!cme.isEarthDirected || !cme.arrivalTime) return false;
      return new Date(cme.arrivalTime) > now;
    })
    .sort((a, b) =>
      new Date(a.arrivalTime!).getTime() - new Date(b.arrivalTime!).getTime()
    );

  const nextArrival = upcoming[0] || null;
  const hoursUntilArrival = nextArrival
    ? (new Date(nextArrival.arrivalTime!).getTime() - now.getTime()) / (1000 * 60 * 60)
    : null;

  return {
    nextArrival,
    recentCmes: cmes.slice(0, 5),
    hoursUntilArrival: hoursUntilArrival ? Math.round(hoursUntilArrival) : null,
  };
}
```

**Step 2: Create CME API function**

Create `lib/api/cme.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayjs } from '../util/time';
import { fetchJson } from './fetchJson';
import { getNextCmeArrival, parseCmeData, type CmeCountdownData } from './parsers/cme';

const NASA_API_KEY = process.env.EXPO_PUBLIC_NASA_API_KEY || 'DEMO_KEY';
const CACHE_KEY = 'cme:countdown';
const CACHE_TTL = 30; // 30 minutes

export async function getCmeCountdown(): Promise<CmeCountdownData> {
  // Check cache
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = dayjs().diff(dayjs(timestamp), 'minute');
      if (age <= CACHE_TTL) return data;
    }
  } catch (e) {
    console.error('Cache read error:', e);
  }

  // Fetch last 30 days of CME data
  const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const endDate = dayjs().format('YYYY-MM-DD');

  try {
    const url = `https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`;
    const raw = await fetchJson(url);
    const cmes = parseCmeData(raw);
    const countdown = getNextCmeArrival(cmes);

    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: countdown, timestamp: new Date().toISOString() })
    );

    return countdown;
  } catch (error) {
    console.error('Failed to fetch CME data:', error);
    return { nextArrival: null, recentCmes: [], hoursUntilArrival: null };
  }
}
```

**Step 3: Create CME Countdown widget**

Create `components/widgets/CmeCountdown.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { getCmeCountdown } from '@/lib/api/cme';
import type { CmeCountdownData } from '@/lib/api/parsers/cme';
import { COLORS } from '@/lib/util/colors';

export function CmeCountdown() {
  const [data, setData] = useState<CmeCountdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCmeCountdown()
      .then(setData)
      .finally(() => setIsLoading(false));

    // Refresh every 15 minutes
    const interval = setInterval(() => {
      getCmeCountdown().then(setData);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (hours: number) => {
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const getUrgencyColor = (hours: number | null) => {
    if (hours === null) return COLORS.muted;
    if (hours < 12) return '#ef4444'; // Imminent
    if (hours < 24) return '#f97316'; // Soon
    if (hours < 48) return '#eab308'; // Approaching
    return '#22c55e'; // Distant
  };

  return (
    <FeatureGate feature="locationPredictions">
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="flash" size={20} color="#f97316" />
          <Text style={styles.title}>CME Watch</Text>
          {isLoading && <ActivityIndicator size="small" color={COLORS.emerald} />}
        </View>

        {data?.nextArrival ? (
          <>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Next storm arrival:</Text>
              <Text style={[styles.countdownValue, { color: getUrgencyColor(data.hoursUntilArrival) }]}>
                {formatCountdown(data.hoursUntilArrival!)}
              </Text>
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Speed</Text>
                <Text style={styles.detailValue}>{data.nextArrival.speed} km/s</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Launched</Text>
                <Text style={styles.detailValue}>
                  {new Date(data.nextArrival.startTime).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ETA</Text>
                <Text style={styles.detailValue}>
                  {new Date(data.nextArrival.arrivalTime!).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noEvent}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <Text style={styles.noEventText}>No Earth-directed CMEs detected</Text>
            <Text style={styles.noEventSubtext}>Space weather is quiet</Text>
          </View>
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
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  countdownLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 4,
  },
  countdownValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  noEvent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  noEventText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  noEventSubtext: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
```

**Step 4: Commit**

```bash
git add lib/api/parsers/cme.ts lib/api/cme.ts components/widgets/CmeCountdown.tsx
git commit -m "feat: add CME countdown widget with NASA DONKI integration"
```

---

## Task 13: Multi-Location Management UI

**Files:**
- Create: `app/locations.tsx`
- Create: `components/locations/LocationManager.tsx`
- Create: `components/locations/AddLocationModal.tsx`

**Step 1: Create AddLocationModal component**

Create `components/locations/AddLocationModal.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { COLORS } from '@/lib/util/colors';

interface AddLocationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddLocationModal({ visible, onClose }: AddLocationModalProps) {
  const { addLocation, currentLocation, isLoading } = useLocationStore();

  const [label, setLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setLat(currentLocation.lat.toFixed(4));
      setLng(currentLocation.lng.toFixed(4));
    }
  };

  const handleSave = async () => {
    if (!label.trim() || !lat || !lng) return;

    await addLocation(label.trim(), parseFloat(lat), parseFloat(lng), isPrimary);
    setLabel('');
    setLat('');
    setLng('');
    setIsPrimary(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Location</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Home, Cabin, etc."
                placeholderTextColor={COLORS.muted}
                value={label}
                onChangeText={setLabel}
              />
            </View>

            <View style={styles.coordsRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="45.0000"
                  placeholderTextColor={COLORS.muted}
                  value={lat}
                  onChangeText={setLat}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="-93.0000"
                  placeholderTextColor={COLORS.muted}
                  value={lng}
                  onChangeText={setLng}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {currentLocation && (
              <Pressable style={styles.useCurrentButton} onPress={handleUseCurrentLocation}>
                <Ionicons name="locate" size={16} color={COLORS.emerald} />
                <Text style={styles.useCurrentText}>Use current location</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.primaryToggle}
              onPress={() => setIsPrimary(!isPrimary)}
            >
              <Ionicons
                name={isPrimary ? 'star' : 'star-outline'}
                size={20}
                color={isPrimary ? '#eab308' : COLORS.muted}
              />
              <Text style={styles.primaryText}>Set as primary location</Text>
            </Pressable>

            <Pressable
              style={[styles.saveButton, (!label || !lat || !lng) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!label || !lat || !lng || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#0B1020" />
              ) : (
                <Text style={styles.saveButtonText}>Save Location</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  coordsRow: {
    flexDirection: 'row',
  },
  useCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  useCurrentText: {
    fontSize: 14,
    color: COLORS.emerald,
  },
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  primaryText: {
    fontSize: 14,
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.emerald,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Step 2: Create LocationManager component**

Create `components/locations/LocationManager.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { useTier } from '@/hooks/useAuth';
import { TIER_FEATURES } from '@/lib/features/tiers';
import { COLORS } from '@/lib/util/colors';
import { AddLocationModal } from './AddLocationModal';

export function LocationManager() {
  const tier = useTier();
  const {
    savedLocations,
    primaryLocation,
    fetchSavedLocations,
    removeLocation,
    setPrimaryLocation,
  } = useLocationStore();

  const [showAddModal, setShowAddModal] = useState(false);

  const maxLocations = TIER_FEATURES[tier].locations;
  const canAddMore = savedLocations.length < maxLocations;

  useEffect(() => {
    fetchSavedLocations();
  }, []);

  const handleRemove = (id: string, label: string) => {
    Alert.alert(
      'Remove Location',
      `Are you sure you want to remove "${label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeLocation(id) },
      ]
    );
  };

  return (
    <FeatureGate feature="locationPredictions">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Saved Locations</Text>
          <Text style={styles.count}>
            {savedLocations.length}/{maxLocations === Infinity ? '∞' : maxLocations}
          </Text>
        </View>

        {savedLocations.map((loc) => (
          <View key={loc.id} style={styles.locationItem}>
            <Pressable
              style={styles.locationInfo}
              onPress={() => setPrimaryLocation(loc.id)}
            >
              <Ionicons
                name={loc.id === primaryLocation?.id ? 'star' : 'star-outline'}
                size={18}
                color={loc.id === primaryLocation?.id ? '#eab308' : COLORS.muted}
              />
              <View style={styles.locationText}>
                <Text style={styles.locationLabel}>{loc.label}</Text>
                <Text style={styles.locationCoords}>
                  {loc.lat.toFixed(2)}°, {loc.lng.toFixed(2)}°
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.removeButton}
              onPress={() => handleRemove(loc.id, loc.label)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </View>
        ))}

        {savedLocations.length === 0 && (
          <Text style={styles.empty}>No saved locations yet</Text>
        )}

        <Pressable
          style={[styles.addButton, !canAddMore && styles.addButtonDisabled]}
          onPress={() => canAddMore && setShowAddModal(true)}
          disabled={!canAddMore}
        >
          <Ionicons name="add" size={20} color={canAddMore ? COLORS.emerald : COLORS.muted} />
          <Text style={[styles.addButtonText, !canAddMore && styles.addButtonTextDisabled]}>
            {canAddMore ? 'Add Location' : `Upgrade to add more (${maxLocations} max)`}
          </Text>
        </Pressable>

        <AddLocationModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  count: {
    fontSize: 14,
    color: COLORS.muted,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  locationCoords: {
    fontSize: 12,
    color: COLORS.muted,
  },
  removeButton: {
    padding: 8,
  },
  empty: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.emerald,
  },
  addButtonTextDisabled: {
    color: COLORS.muted,
  },
});
```

**Step 3: Create locations page**

Create `app/locations.tsx`:
```typescript
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LocationManager } from '@/components/locations/LocationManager';
import { LocationPrediction } from '@/components/predictions/LocationPrediction';
import { COLORS } from '@/lib/util/colors';

export default function LocationsPage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Location Forecasts</Text>
        <Text style={styles.subtitle}>
          Track aurora predictions for your favorite spots
        </Text>

        <LocationPrediction />
        <LocationManager />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 24,
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
    marginBottom: 24,
  },
});
```

**Step 4: Add route to layout**

Add to `app/_layout.tsx`:
```typescript
<Stack.Screen
  name="locations"
  options={{
    headerTitle: 'Locations',
    headerStyle: { backgroundColor: '#0B1020' },
    headerTintColor: '#E6ECFF',
  }}
/>
```

**Step 5: Commit**

```bash
git add components/locations/ app/locations.tsx app/_layout.tsx
git commit -m "feat: add multi-location management UI with add/remove/primary"
```

---

## Task 14: Historical Data Explorer (90 days)

**Files:**
- Create: `lib/api/history.ts`
- Create: `components/history/HistoryExplorer.tsx`
- Create: `app/history.tsx`

**Step 1: Create history API**

Create `lib/api/history.ts`:
```typescript
import { supabase } from '../supabase/client';
import type { SubscriptionTier } from '../supabase/types';
import { TIER_FEATURES } from '../features/tiers';

export interface HistoricalDataPoint {
  timestamp: string;
  kp: number | null;
  bz: number | null;
  speed: number | null;
  density: number | null;
}

export async function getHistoricalData(
  tier: SubscriptionTier,
  startDate: Date,
  endDate: Date
): Promise<HistoricalDataPoint[]> {
  const maxDays = TIER_FEATURES[tier].historyDays;
  const now = new Date();
  const maxStartDate = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);

  // Clamp start date to tier limit
  const effectiveStart = startDate < maxStartDate ? maxStartDate : startDate;

  // Query Supabase for historical data
  const { data: kpData, error: kpError } = await supabase
    .from('kp_history')
    .select('timestamp, value')
    .gte('timestamp', effectiveStart.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: true });

  const { data: swData, error: swError } = await supabase
    .from('solar_wind_history')
    .select('timestamp, bz, speed, density')
    .gte('timestamp', effectiveStart.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: true });

  if (kpError || swError) {
    console.error('Failed to fetch historical data:', kpError || swError);
    return [];
  }

  // Merge data by timestamp (hourly buckets)
  const dataMap = new Map<string, HistoricalDataPoint>();

  for (const kp of kpData || []) {
    const hourKey = kp.timestamp.slice(0, 13); // YYYY-MM-DDTHH
    dataMap.set(hourKey, {
      timestamp: kp.timestamp,
      kp: kp.value,
      bz: null,
      speed: null,
      density: null,
    });
  }

  for (const sw of swData || []) {
    const hourKey = sw.timestamp.slice(0, 13);
    const existing = dataMap.get(hourKey);
    if (existing) {
      existing.bz = sw.bz;
      existing.speed = sw.speed;
      existing.density = sw.density;
    } else {
      dataMap.set(hourKey, {
        timestamp: sw.timestamp,
        kp: null,
        bz: sw.bz,
        speed: sw.speed,
        density: sw.density,
      });
    }
  }

  return Array.from(dataMap.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
```

**Step 2: Create HistoryExplorer component**

Create `components/history/HistoryExplorer.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { getHistoricalData, type HistoricalDataPoint } from '@/lib/api/history';
import { useTier } from '@/hooks/useAuth';
import { TIER_FEATURES } from '@/lib/features/tiers';
import { COLORS } from '@/lib/util/colors';

const { width: screenWidth } = Dimensions.get('window');

type TimeRange = '7d' | '30d' | '90d';

export function HistoryExplorer() {
  const tier = useTier();
  const [range, setRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<HistoricalDataPoint | null>(null);

  const maxDays = TIER_FEATURES[tier].historyDays;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const result = await getHistoricalData(tier, startDate, endDate);
      setData(result);
      setIsLoading(false);
    };

    fetchData();
  }, [range, tier]);

  const maxKp = Math.max(...data.map((d) => d.kp ?? 0), 9);

  return (
    <FeatureGate feature="locationPredictions">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Historical Data</Text>
          <Text style={styles.tierInfo}>{maxDays} days available</Text>
        </View>

        {/* Time range selector */}
        <View style={styles.rangeSelector}>
          {(['7d', '30d', '90d'] as TimeRange[]).map((r) => {
            const days = r === '7d' ? 7 : r === '30d' ? 30 : 90;
            const disabled = days > maxDays;

            return (
              <Pressable
                key={r}
                style={[
                  styles.rangeButton,
                  range === r && styles.rangeButtonActive,
                  disabled && styles.rangeButtonDisabled,
                ]}
                onPress={() => !disabled && setRange(r)}
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.rangeText,
                    range === r && styles.rangeTextActive,
                    disabled && styles.rangeTextDisabled,
                  ]}
                >
                  {r}
                </Text>
                {disabled && <Ionicons name="lock-closed" size={12} color={COLORS.muted} />}
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.emerald} />
          </View>
        ) : (
          <>
            {/* Kp chart */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Kp Index</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartBars}>
                  {data.map((d, i) => (
                    <Pressable
                      key={i}
                      style={styles.barContainer}
                      onPress={() => setSelectedPoint(d)}
                    >
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(4, ((d.kp ?? 0) / maxKp) * 80),
                            backgroundColor:
                              (d.kp ?? 0) >= 7 ? '#ef4444' :
                              (d.kp ?? 0) >= 5 ? '#f97316' :
                              (d.kp ?? 0) >= 4 ? '#eab308' : '#22c55e',
                          },
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Selected point details */}
            {selectedPoint && (
              <View style={styles.details}>
                <Text style={styles.detailsTitle}>
                  {new Date(selectedPoint.timestamp).toLocaleString()}
                </Text>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Kp</Text>
                    <Text style={styles.detailValue}>{selectedPoint.kp?.toFixed(1) ?? '-'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Bz</Text>
                    <Text style={styles.detailValue}>{selectedPoint.bz?.toFixed(1) ?? '-'} nT</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Speed</Text>
                    <Text style={styles.detailValue}>{selectedPoint.speed?.toFixed(0) ?? '-'} km/s</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Density</Text>
                    <Text style={styles.detailValue}>{selectedPoint.density?.toFixed(1) ?? '-'} p/cm³</Text>
                  </View>
                </View>
              </View>
            )}

            {data.length === 0 && (
              <Text style={styles.empty}>No historical data available</Text>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  tierInfo: {
    fontSize: 12,
    color: COLORS.muted,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  rangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  rangeButtonActive: {
    backgroundColor: COLORS.emerald,
  },
  rangeButtonDisabled: {
    opacity: 0.5,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  rangeTextActive: {
    color: '#0B1020',
  },
  rangeTextDisabled: {
    color: COLORS.muted,
  },
  loading: {
    padding: 32,
    alignItems: 'center',
  },
  chartContainer: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 1,
  },
  barContainer: {
    width: 4,
    height: 80,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 4,
  },
  details: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    minWidth: 70,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  empty: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    padding: 32,
  },
});
```

**Step 3: Create history page**

Create `app/history.tsx`:
```typescript
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HistoryExplorer } from '@/components/history/HistoryExplorer';
import { COLORS } from '@/lib/util/colors';

export default function HistoryPage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Activity History</Text>
        <Text style={styles.subtitle}>
          Explore past space weather conditions
        </Text>

        <HistoryExplorer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 24,
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
    marginBottom: 24,
  },
});
```

**Step 4: Add route to layout**

Add to `app/_layout.tsx`:
```typescript
<Stack.Screen
  name="history"
  options={{
    headerTitle: 'History',
    headerStyle: { backgroundColor: '#0B1020' },
    headerTintColor: '#E6ECFF',
  }}
/>
```

**Step 5: Commit**

```bash
git add lib/api/history.ts components/history/ app/history.tsx app/_layout.tsx
git commit -m "feat: add 90-day historical data explorer with tier-based limits"
```

---

## Task 15: Browser Push Notifications

**Files:**
- Create: `lib/services/pushNotifications.ts`
- Create: `lib/services/serviceWorker.ts`
- Modify: `lib/state/useAlertStore.ts`

**Step 1: Create push notification service**

Create `lib/services/pushNotifications.ts`:
```typescript
import { supabase } from '../supabase/client';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notifications are blocked');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID public key not configured');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Send subscription to backend
    await savePushSubscription(subscription);

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await removePushSubscription();
    }
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
  }
}

async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
    auth: arrayBufferToBase64(subscription.getKey('auth')!),
  });
}

async function removePushSubscription(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
```

**Step 2: Create service worker file**

Create `public/sw.js` (this goes in the public folder for web):
```javascript
// Service worker for push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'solarstorm-alert',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SolarStorm Alert', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
```

**Step 3: Register service worker in app**

Create `lib/services/registerServiceWorker.ts`:
```typescript
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}
```

**Step 4: Update alert store to integrate push**

Update `lib/state/useAlertStore.ts` to add push subscription methods:
```typescript
// Add to actions:
subscribeToPush: async () => {
  const hasPermission = await requestPushPermission();
  if (!hasPermission) {
    set({ error: 'Push notification permission denied' });
    return;
  }

  const subscription = await subscribeToPush();
  if (subscription) {
    await get().updateConfig({ push_enabled: true });
  }
},

unsubscribeFromPush: async () => {
  await unsubscribeFromPush();
  await get().updateConfig({ push_enabled: false });
},
```

**Step 5: Add to app initialization**

In `app/_layout.tsx`, add service worker registration:
```typescript
import { registerServiceWorker } from '@/lib/services/registerServiceWorker';

useEffect(() => {
  // Register service worker for web push
  if (typeof window !== 'undefined') {
    registerServiceWorker();
  }
}, []);
```

**Step 6: Commit**

```bash
git add lib/services/pushNotifications.ts lib/services/registerServiceWorker.ts public/sw.js lib/state/useAlertStore.ts app/_layout.tsx
git commit -m "feat: add browser push notifications with service worker"
```

---

## Task 16: Integrate All Plus Features into Dashboard

**Files:**
- Modify: `app/index.tsx` or `app/dashboard.tsx`

**Step 1: Import all new components**

Add to dashboard imports:
```typescript
import { SfiTrendChart } from '@/components/charts/SfiTrendChart';
import { CmeCountdown } from '@/components/widgets/CmeCountdown';
import { LocationPrediction } from '@/components/predictions/LocationPrediction';
import { HfPropagationMap } from '@/components/hf/HfPropagationMap';
import { PhotoPlanning } from '@/components/photo/PhotoPlanning';
```

**Step 2: Add components to dashboard layout**

Add after existing content sections:
```typescript
{/* CME Watch - Plus feature */}
<Section>
  <CmeCountdown />
</Section>

{/* Location Predictions - Plus feature */}
<Section title="Your Aurora Forecast">
  <LocationPrediction />
</Section>

{/* Ham Radio Features - Plus feature */}
<Section title="HF Propagation">
  <HfPropagationMap />
  <SfiTrendChart />
</Section>

{/* Photo Planning - Plus feature */}
<Section>
  <PhotoPlanning />
</Section>

{/* Navigation to other Plus pages */}
<FeatureGate feature="locationPredictions">
  <View style={styles.plusNav}>
    <Pressable style={styles.navButton} onPress={() => router.push('/globe')}>
      <Ionicons name="globe-outline" size={20} color={COLORS.text} />
      <Text style={styles.navButtonText}>3D Globe</Text>
    </Pressable>
    <Pressable style={styles.navButton} onPress={() => router.push('/locations')}>
      <Ionicons name="location-outline" size={20} color={COLORS.text} />
      <Text style={styles.navButtonText}>Locations</Text>
    </Pressable>
    <Pressable style={styles.navButton} onPress={() => router.push('/history')}>
      <Ionicons name="time-outline" size={20} color={COLORS.text} />
      <Text style={styles.navButtonText}>History</Text>
    </Pressable>
  </View>
</FeatureGate>
```

**Step 3: Add styles**

```typescript
plusNav: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  marginTop: 16,
},
navButton: {
  alignItems: 'center',
  gap: 4,
},
navButtonText: {
  fontSize: 12,
  color: COLORS.text,
},
```

**Step 4: Run tests**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm test
```

**Step 5: Verify the app**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm run web
```

**Step 6: Commit**

```bash
git add app/
git commit -m "feat: integrate all Plus tier features into dashboard"
```

---

## Summary

Phase 2 delivers the complete Plus tier "wow factor":

1. **3D Globe** - React Three Fiber visualization of aurora oval
2. **Location Predictions** - Personalized probability based on coordinates
3. **Multi-Location Management** - Save and track up to 5 locations
4. **Alert System** - Configurable Kp/Bz thresholds with unlimited alerts
5. **Quiet Hours** - Alert blackout periods (via time picker in settings)
6. **HF Propagation** - Band usability for ham radio operators
7. **Solar Flux Index (SFI)** - F10.7 trends chart for propagation planning
8. **CME Countdown** - Visual countdown to predicted storm arrival
9. **R-Scale Status** - Radio blackout severity indicator
10. **Photo Planning** - Weather + aurora conditions for photographers
11. **Historical Data** - 90-day data explorer with tier limits
12. **Browser Push Notifications** - Web Push API integration

**All features are gated** - Free users see upgrade prompts, Plus users get full access.

**Next Steps (Phase 3):**
- Satellite fleet manager
- Drag risk calculator
- API endpoints
- Power grid features (GIC, dB/dt)
- GNSS features (TEC, scintillation)
- Aviation features (radiation dose, polar routes)

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
- `three`, `@react-three/fiber`, `@react-three/drei` - 3D rendering with Earth textures
- `@react-native-community/slider` - Alert threshold sliders
- `@react-native-community/datetimepicker` - Quiet hours time picker
