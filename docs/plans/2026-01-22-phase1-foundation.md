# Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform SolarStorm from a mobile-only app to a web-first platform with authentication, subscription payments, and tier-based feature gating.

**Architecture:** Expo web export for frontend, Supabase for auth/database/edge functions, Stripe for payments. The existing React Native components will be reused where possible, with new pages for landing, auth, and pricing.

**Tech Stack:** Expo (web), Supabase (auth, Postgres, Edge Functions), Stripe (subscriptions), Zustand (state), existing Skia components

---

## Prerequisites

Before starting, you need:
1. A Supabase project (create at https://supabase.com)
2. A Stripe account with test mode enabled (create at https://stripe.com)
3. Stripe CLI installed for webhook testing (`brew install stripe/stripe-cli/stripe`)

---

## Task 1: Install Supabase Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Supabase client**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm install @supabase/supabase-js @supabase/auth-helpers-react
```

Expected: Packages added to node_modules, package.json updated

**Step 2: Verify installation**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm list @supabase/supabase-js
```

Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add Supabase dependencies"
```

---

## Task 2: Create Supabase Client Configuration

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/types.ts`
- Create: `.env.local.example`

**Step 1: Create environment example file**

Create `.env.local.example`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

**Step 2: Create Supabase types file**

Create `lib/supabase/types.ts`:
```typescript
export type SubscriptionTier = 'free' | 'plus' | 'pro' | 'enterprise';

export interface Profile {
  id: string;
  email: string;
  tier: SubscriptionTier;
  stripe_customer_id: string | null;
  org_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  tier: SubscriptionTier;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface AlertConfig {
  id: string;
  user_id: string;
  kp_threshold: number;
  bz_threshold: number | null;
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_start: string | null; // HH:MM format
  quiet_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserLocation {
  id: string;
  user_id: string;
  label: string;
  lat: number;
  lng: number;
  is_primary: boolean;
  created_at: string;
}

// =====================================================
// SATELLITE OPERATIONS TYPES
// =====================================================

export type OrbitType = 'LEO' | 'MEO' | 'GEO' | 'HEO';
export type AnomalyType = 'safe_mode' | 'reboot' | 'sensor_error' | 'comm_loss' | 'attitude_error' | 'power_anomaly' | 'other';
export type AnomalySeverity = 'minor' | 'moderate' | 'severe' | 'critical';

export interface Satellite {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  norad_id: number | null;
  altitude_km: number;
  inclination_deg: number;
  ballistic_coefficient: number | null;
  orbit_type: OrbitType;
  is_orbit_raising: boolean;
  launch_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SatelliteAnomaly {
  id: string;
  satellite_id: string;
  user_id: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  description: string | null;
  occurred_at: string;
  kp_at_time: number | null;
  proton_flux_at_time: number | null;
  electron_flux_at_time: number | null;
  created_at: string;
}

// =====================================================
// GNSS OPERATIONS TYPES
// =====================================================

export type GnssConstellation = 'GPS' | 'GLONASS' | 'Galileo' | 'BeiDou';

export interface GnssRegion {
  id: string;
  user_id: string;
  label: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  is_primary: boolean;
  created_at: string;
}

export interface GnssConstellationStatus {
  id: number;
  timestamp: string;
  constellation: GnssConstellation;
  healthy_count: number;
  unhealthy_count: number;
  degraded_count: number;
  notes: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      alert_configs: {
        Row: AlertConfig;
        Insert: Omit<AlertConfig, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AlertConfig, 'id' | 'user_id' | 'created_at'>>;
      };
      user_locations: {
        Row: UserLocation;
        Insert: Omit<UserLocation, 'id' | 'created_at'>;
        Update: Partial<Omit<UserLocation, 'id' | 'user_id' | 'created_at'>>;
      };
      satellites: {
        Row: Satellite;
        Insert: Omit<Satellite, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Satellite, 'id' | 'user_id' | 'created_at'>>;
      };
      satellite_anomalies: {
        Row: SatelliteAnomaly;
        Insert: Omit<SatelliteAnomaly, 'id' | 'created_at'>;
        Update: Partial<Omit<SatelliteAnomaly, 'id' | 'user_id' | 'satellite_id' | 'created_at'>>;
      };
      gnss_regions: {
        Row: GnssRegion;
        Insert: Omit<GnssRegion, 'id' | 'created_at'>;
        Update: Partial<Omit<GnssRegion, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}
```

**Step 3: Create Supabase client**

Create `lib/supabase/client.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import type { Database } from './types';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

**Step 4: Commit**

```bash
git add lib/supabase/ .env.local.example
git commit -m "feat: add Supabase client configuration and types"
```

---

## Task 3: Create Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Create migrations directory**

Run:
```bash
mkdir -p supabase/migrations
```

**Step 2: Create initial schema migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for org_id
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_org
FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Organization members (for enterprise teams)
CREATE TABLE public.org_members (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Alert configurations
CREATE TABLE public.alert_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kp_threshold INTEGER NOT NULL DEFAULT 5 CHECK (kp_threshold >= 0 AND kp_threshold <= 9),
  bz_threshold INTEGER CHECK (bz_threshold IS NULL OR bz_threshold <= 0),
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_start TIME,
  quiet_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User saved locations
CREATE TABLE public.user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert log (for tracking sent alerts and enforcing limits)
CREATE TABLE public.alert_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  payload JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Space weather history (for historical features)
CREATE TABLE public.kp_history (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  source TEXT DEFAULT 'noaa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.solar_wind_history (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  bz DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  density DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SATELLITE OPERATIONS TABLES
-- =====================================================

-- User satellite fleet
CREATE TABLE public.satellites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  norad_id INTEGER, -- NORAD catalog ID for TLE lookup
  altitude_km DOUBLE PRECISION NOT NULL,
  inclination_deg DOUBLE PRECISION NOT NULL,
  ballistic_coefficient DOUBLE PRECISION, -- kg/m² for drag calculations
  orbit_type TEXT NOT NULL CHECK (orbit_type IN ('LEO', 'MEO', 'GEO', 'HEO')),
  is_orbit_raising BOOLEAN NOT NULL DEFAULT false, -- Special monitoring for new satellites
  launch_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Satellite anomaly log (correlate with space weather)
CREATE TABLE public.satellite_anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  satellite_id UUID NOT NULL REFERENCES public.satellites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('safe_mode', 'reboot', 'sensor_error', 'comm_loss', 'attitude_error', 'power_anomaly', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  -- Space weather context at time of anomaly (auto-populated)
  kp_at_time DOUBLE PRECISION,
  proton_flux_at_time DOUBLE PRECISION,
  electron_flux_at_time DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proton flux history (GOES EPAM - for SEP events)
CREATE TABLE public.proton_flux_history (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  flux_10mev DOUBLE PRECISION, -- >10 MeV protons (pfu)
  flux_50mev DOUBLE PRECISION, -- >50 MeV protons (pfu)
  flux_100mev DOUBLE PRECISION, -- >100 MeV protons (pfu)
  source TEXT DEFAULT 'goes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Electron flux history (GOES - for GEO surface charging)
CREATE TABLE public.electron_flux_history (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  flux_08mev DOUBLE PRECISION, -- >0.8 MeV electrons
  flux_2mev DOUBLE PRECISION,  -- >2 MeV electrons
  source TEXT DEFAULT 'goes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- GNSS OPERATIONS TABLES
-- =====================================================

-- User GNSS regions of interest
CREATE TABLE public.gnss_regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 500,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ionospheric TEC history
CREATE TABLE public.tec_history (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  tec_value DOUBLE PRECISION NOT NULL, -- Total Electron Content (TECU)
  source TEXT DEFAULT 'noaa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scintillation index history
CREATE TABLE public.scintillation_history (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  s4_index DOUBLE PRECISION, -- Amplitude scintillation
  sigma_phi DOUBLE PRECISION, -- Phase scintillation
  source TEXT DEFAULT 'noaa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GNSS constellation status snapshots
CREATE TABLE public.gnss_constellation_status (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  constellation TEXT NOT NULL CHECK (constellation IN ('GPS', 'GLONASS', 'Galileo', 'BeiDou')),
  healthy_count INTEGER NOT NULL,
  unhealthy_count INTEGER NOT NULL,
  degraded_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_tier ON public.profiles(tier);
CREATE INDEX idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX idx_alert_configs_user_id ON public.alert_configs(user_id);
CREATE INDEX idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX idx_alert_log_user_id ON public.alert_log(user_id);
CREATE INDEX idx_alert_log_sent_at ON public.alert_log(sent_at);
CREATE INDEX idx_kp_history_timestamp ON public.kp_history(timestamp);
CREATE INDEX idx_solar_wind_history_timestamp ON public.solar_wind_history(timestamp);

-- Satellite indexes
CREATE INDEX idx_satellites_user_id ON public.satellites(user_id);
CREATE INDEX idx_satellites_org_id ON public.satellites(org_id);
CREATE INDEX idx_satellites_norad_id ON public.satellites(norad_id);
CREATE INDEX idx_satellites_orbit_type ON public.satellites(orbit_type);
CREATE INDEX idx_satellite_anomalies_satellite_id ON public.satellite_anomalies(satellite_id);
CREATE INDEX idx_satellite_anomalies_occurred_at ON public.satellite_anomalies(occurred_at);
CREATE INDEX idx_proton_flux_history_timestamp ON public.proton_flux_history(timestamp);
CREATE INDEX idx_electron_flux_history_timestamp ON public.electron_flux_history(timestamp);

-- GNSS indexes
CREATE INDEX idx_gnss_regions_user_id ON public.gnss_regions(user_id);
CREATE INDEX idx_tec_history_timestamp ON public.tec_history(timestamp);
CREATE INDEX idx_tec_history_location ON public.tec_history(lat, lng);
CREATE INDEX idx_scintillation_history_timestamp ON public.scintillation_history(timestamp);
CREATE INDEX idx_gnss_constellation_status_timestamp ON public.gnss_constellation_status(timestamp);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnss_regions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Alert configs policies
CREATE POLICY "Users can view own alert configs"
  ON public.alert_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert configs"
  ON public.alert_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert configs"
  ON public.alert_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alert configs"
  ON public.alert_configs FOR DELETE
  USING (auth.uid() = user_id);

-- User locations policies
CREATE POLICY "Users can view own locations"
  ON public.user_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own locations"
  ON public.user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locations"
  ON public.user_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own locations"
  ON public.user_locations FOR DELETE
  USING (auth.uid() = user_id);

-- Alert log policies
CREATE POLICY "Users can view own alert log"
  ON public.alert_log FOR SELECT
  USING (auth.uid() = user_id);

-- Satellite policies
CREATE POLICY "Users can view own satellites"
  ON public.satellites FOR SELECT
  USING (auth.uid() = user_id OR org_id IN (
    SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own satellites"
  ON public.satellites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own satellites"
  ON public.satellites FOR UPDATE
  USING (auth.uid() = user_id OR org_id IN (
    SELECT om.org_id FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can delete own satellites"
  ON public.satellites FOR DELETE
  USING (auth.uid() = user_id);

-- Satellite anomaly policies
CREATE POLICY "Users can view own anomalies"
  ON public.satellite_anomalies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own anomalies"
  ON public.satellite_anomalies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anomalies"
  ON public.satellite_anomalies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own anomalies"
  ON public.satellite_anomalies FOR DELETE
  USING (auth.uid() = user_id);

-- GNSS region policies
CREATE POLICY "Users can view own GNSS regions"
  ON public.gnss_regions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own GNSS regions"
  ON public.gnss_regions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own GNSS regions"
  ON public.gnss_regions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own GNSS regions"
  ON public.gnss_regions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier)
  VALUES (NEW.id, NEW.email, 'free');

  INSERT INTO public.alert_configs (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_alert_configs_updated_at
  BEFORE UPDATE ON public.alert_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema migration"
```

---

## Task 4: Create Auth Store and Hooks

**Files:**
- Create: `lib/state/useAuthStore.ts`
- Create: `hooks/useAuth.ts`

**Step 1: Create auth store**

Create `lib/state/useAuthStore.ts`:
```typescript
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../supabase/client';
import type { Profile, SubscriptionTier } from '../supabase/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;

  // Derived
  tier: SubscriptionTier;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  tier: 'free',
  isAuthenticated: false,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session) {
        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        set({
          session,
          user: session.user,
          profile,
          tier: profile?.tier || 'free',
          isAuthenticated: true,
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          set({
            session,
            user: session.user,
            profile,
            tier: profile?.tier || 'free',
            isAuthenticated: true,
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            session: null,
            user: null,
            profile: null,
            tier: 'free',
            isAuthenticated: false,
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to initialize auth' });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign in' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign up' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithMagicLink: async (email: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/dashboard`
            : undefined,
        },
      });

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send magic link' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign out' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      set({
        profile,
        tier: profile?.tier || 'free',
      });
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
```

**Step 2: Create useAuth hook**

Create `hooks/useAuth.ts`:
```typescript
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/state/useAuthStore';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    store.initialize();
  }, []);

  return store;
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();

  return { isAuthenticated, isLoading };
}

export function useTier() {
  return useAuthStore((state) => state.tier);
}

export function useIsPro() {
  const tier = useTier();
  return tier === 'pro' || tier === 'enterprise';
}

export function useIsPlus() {
  const tier = useTier();
  return tier === 'plus' || tier === 'pro' || tier === 'enterprise';
}

export function useIsEnterprise() {
  const tier = useTier();
  return tier === 'enterprise';
}
```

**Step 3: Run tests to ensure nothing broke**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm test
```

Expected: All 24 tests pass

**Step 4: Commit**

```bash
git add lib/state/useAuthStore.ts hooks/useAuth.ts
git commit -m "feat: add auth store and hooks with tier checking"
```

---

## Task 5: Create Feature Gate Component

**Files:**
- Create: `components/FeatureGate.tsx`
- Create: `lib/features/tiers.ts`

**Step 1: Create tier feature definitions**

Create `lib/features/tiers.ts`:
```typescript
import type { SubscriptionTier } from '../supabase/types';

export const TIER_FEATURES = {
  free: {
    alertsPerDay: 1,
    historyDays: 7,
    locations: 1,
    globe3d: false,
    locationPredictions: false,
    hfPropagation: false,
    photoPlanning: false,
    satelliteRisk: false,
    apiAccess: false,
    dataExport: false,
  },
  plus: {
    alertsPerDay: Infinity,
    historyDays: 90,
    locations: 5,
    globe3d: true,
    locationPredictions: true,
    hfPropagation: true,
    photoPlanning: true,
    satelliteRisk: false,
    apiAccess: false,
    dataExport: false,
  },
  pro: {
    alertsPerDay: Infinity,
    historyDays: 730, // 2 years
    locations: 20,
    globe3d: true,
    locationPredictions: true,
    hfPropagation: true,
    photoPlanning: true,
    satelliteRisk: true,
    apiAccess: true,
    dataExport: true,
  },
  enterprise: {
    alertsPerDay: Infinity,
    historyDays: 730,
    locations: Infinity,
    globe3d: true,
    locationPredictions: true,
    hfPropagation: true,
    photoPlanning: true,
    satelliteRisk: true,
    apiAccess: true,
    dataExport: true,
  },
} as const;

export type FeatureKey = keyof typeof TIER_FEATURES.free;

export function hasFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return Boolean(TIER_FEATURES[tier][feature]);
}

export function getFeatureLimit(tier: SubscriptionTier, feature: FeatureKey): number {
  const value = TIER_FEATURES[tier][feature];
  return typeof value === 'number' ? value : 0;
}

export function getUpgradeTier(currentTier: SubscriptionTier, feature: FeatureKey): SubscriptionTier | null {
  const tiers: SubscriptionTier[] = ['free', 'plus', 'pro', 'enterprise'];
  const currentIndex = tiers.indexOf(currentTier);

  for (let i = currentIndex + 1; i < tiers.length; i++) {
    if (hasFeature(tiers[i], feature)) {
      return tiers[i];
    }
  }

  return null;
}
```

**Step 2: Create FeatureGate component**

Create `components/FeatureGate.tsx`:
```typescript
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTier } from '@/hooks/useAuth';
import { type FeatureKey, getUpgradeTier, hasFeature } from '@/lib/features/tiers';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
}: FeatureGateProps) {
  const tier = useTier();
  const router = useRouter();
  const hasAccess = hasFeature(tier, feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  const upgradeTier = getUpgradeTier(tier, feature);

  return (
    <View style={styles.container}>
      <View style={styles.blur}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>
          {upgradeTier ? `Unlock with ${upgradeTier.charAt(0).toUpperCase() + upgradeTier.slice(1)}` : 'Premium Feature'}
        </Text>
        {upgradeTier && (
          <Pressable
            style={styles.button}
            onPress={() => router.push('/pricing')}
          >
            <Text style={styles.buttonText}>View Plans</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 16, 32, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  lockIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#00D084',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#0B1020',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

**Step 3: Commit**

```bash
git add lib/features/tiers.ts components/FeatureGate.tsx
git commit -m "feat: add feature gate component for tier-based access control"
```

---

## Task 6: Install and Configure Stripe

**Files:**
- Modify: `package.json`
- Create: `lib/stripe/client.ts`
- Create: `lib/stripe/config.ts`

**Step 1: Install Stripe**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm install @stripe/stripe-js
```

**Step 2: Create Stripe config**

Create `lib/stripe/config.ts`:
```typescript
export const STRIPE_CONFIG = {
  prices: {
    plus_monthly: process.env.EXPO_PUBLIC_STRIPE_PLUS_MONTHLY_PRICE_ID || '',
    plus_yearly: process.env.EXPO_PUBLIC_STRIPE_PLUS_YEARLY_PRICE_ID || '',
    pro_monthly: process.env.EXPO_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    pro_yearly: process.env.EXPO_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
    enterprise_monthly: process.env.EXPO_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '',
  },
  tiers: {
    plus: {
      name: 'Plus',
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      description: 'For aurora enthusiasts and ham radio operators',
      features: [
        '3D Interactive Globe',
        'Location-based predictions',
        'Unlimited smart alerts',
        'HF propagation maps',
        '90-day history',
      ],
    },
    pro: {
      name: 'Pro',
      monthlyPrice: 49,
      yearlyPrice: 490,
      description: 'For satellite operators and professionals',
      features: [
        'Everything in Plus',
        'Satellite fleet manager',
        'Drag risk calculator',
        'Safe mode recommendations',
        'API access (1000 req/day)',
        '2-year history',
      ],
    },
    enterprise: {
      name: 'Enterprise',
      monthlyPrice: 199,
      yearlyPrice: null, // Custom pricing
      description: 'For large teams and critical infrastructure',
      features: [
        'Everything in Pro',
        'Team management & SSO',
        'Custom alert rules',
        'Webhook integrations',
        'SLA guarantee',
        'Dedicated support',
      ],
    },
  },
} as const;
```

**Step 3: Create Stripe client**

Create `lib/stripe/client.ts`:
```typescript
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import Constants from 'expo-constants';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = Constants.expoConfig?.extra?.stripePublishableKey ||
                process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!key) {
      console.error('Missing Stripe publishable key');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(key);
  }

  return stripePromise;
}

export async function redirectToCheckout(priceId: string, customerId?: string) {
  const stripe = await getStripe();

  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  // For now, we'll redirect to Stripe Checkout
  // In production, you'd create a checkout session via your backend
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/dashboard?success=true`,
    cancelUrl: `${window.location.origin}/pricing?canceled=true`,
    customerEmail: customerId, // Use email if no customer ID
  });

  if (error) {
    throw error;
  }
}
```

**Step 4: Update environment example**

Update `.env.local.example`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
EXPO_PUBLIC_STRIPE_PLUS_MONTHLY_PRICE_ID=price_xxx
EXPO_PUBLIC_STRIPE_PLUS_YEARLY_PRICE_ID=price_xxx
EXPO_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
EXPO_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
EXPO_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
```

**Step 5: Commit**

```bash
git add package.json package-lock.json lib/stripe/ .env.local.example
git commit -m "feat: add Stripe configuration for subscriptions"
```

---

## Task 7: Create Landing Page

**Files:**
- Create: `app/index.tsx` (replace existing)
- Create: `components/landing/Hero.tsx`
- Create: `components/landing/Features.tsx`
- Create: `components/landing/Pricing.tsx`

**Step 1: Create Hero component**

Create `components/landing/Hero.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Hero() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="flash" size={14} color="#00D084" />
        <Text style={styles.badgeText}>Space Weather Intelligence</Text>
      </View>

      <Text style={styles.title}>
        Know Before{'\n'}the Storm Hits
      </Text>

      <Text style={styles.subtitle}>
        Protect million-dollar satellites, power grids, and critical infrastructure
        with real-time space weather forecasting and decision-ready alerts.
      </Text>

      <View style={styles.buttons}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.primaryButtonText}>Start Free</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/pricing')}
        >
          <Text style={styles.secondaryButtonText}>View Pricing</Text>
        </Pressable>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>40+</Text>
          <Text style={styles.statLabel}>Satellites lost in 2022 storm</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>$5-10M</Text>
          <Text style={styles.statLabel}>Per satellite replacement</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>30 min</Text>
          <Text style={styles.statLabel}>Advance warning time</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 64,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
    gap: 6,
  },
  badgeText: {
    color: '#00D084',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#E6ECFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 56,
  },
  subtitle: {
    fontSize: 18,
    color: '#9AA4C2',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 28,
    marginBottom: 32,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 48,
  },
  primaryButton: {
    backgroundColor: '#00D084',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E2347',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 48,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00D084',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9AA4C2',
    textAlign: 'center',
  },
});
```

**Step 2: Create Features component**

Create `components/landing/Features.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const FEATURES = [
  {
    icon: 'planet-outline' as const,
    title: 'Satellite Protection',
    description: 'Real-time drag risk assessment, safe mode recommendations, and maneuver window planning for LEO/MEO/GEO operations.',
  },
  {
    icon: 'flash-outline' as const,
    title: 'Power Grid Alerts',
    description: 'GIC risk maps and transformer protection alerts to prevent cascading blackouts during geomagnetic storms.',
  },
  {
    icon: 'airplane-outline' as const,
    title: 'Aviation Safety',
    description: 'Polar route HF blackout forecasts and radiation dose estimates for flight operations.',
  },
  {
    icon: 'location-outline' as const,
    title: 'Location Predictions',
    description: 'Personalized aurora forecasts based on your coordinates, magnetic latitude, and current conditions.',
  },
  {
    icon: 'radio-outline' as const,
    title: 'HF Propagation',
    description: 'Band-by-band usability forecasts for amateur radio operators and emergency communications.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Smart Alerts',
    description: 'Customizable thresholds, quiet hours, and multi-channel notifications (email, push, webhook).',
  },
];

export function Features() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Built for Mission-Critical Operations</Text>
      <Text style={styles.sectionSubtitle}>
        From hobbyist aurora chasers to satellite fleet operators, SolarStorm delivers
        decision-ready intelligence tailored to your needs.
      </Text>

      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name={feature.icon} size={24} color="#00D084" />
            </View>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDescription}>{feature.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 64,
    backgroundColor: '#111833',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#E6ECFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#9AA4C2',
    textAlign: 'center',
    maxWidth: 600,
    alignSelf: 'center',
    marginBottom: 48,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#0B1020',
    borderRadius: 12,
    padding: 24,
    width: 350,
    borderWidth: 1,
    borderColor: '#1E2347',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E6ECFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#9AA4C2',
    lineHeight: 22,
  },
});
```

**Step 3: Create Pricing component**

Create `components/landing/Pricing.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STRIPE_CONFIG } from '@/lib/stripe/config';

export function Pricing() {
  const router = useRouter();
  const [annual, setAnnual] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Simple, Transparent Pricing</Text>
      <Text style={styles.sectionSubtitle}>
        Start free, upgrade when you need more. No hidden fees.
      </Text>

      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleOption, !annual && styles.toggleActive]}
          onPress={() => setAnnual(false)}
        >
          <Text style={[styles.toggleText, !annual && styles.toggleTextActive]}>Monthly</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleOption, annual && styles.toggleActive]}
          onPress={() => setAnnual(true)}
        >
          <Text style={[styles.toggleText, annual && styles.toggleTextActive]}>
            Annual <Text style={styles.discount}>Save 17%</Text>
          </Text>
        </Pressable>
      </View>

      <View style={styles.cards}>
        {/* Free Tier */}
        <View style={styles.card}>
          <Text style={styles.tierName}>Free</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$0</Text>
            <Text style={styles.period}>/forever</Text>
          </View>
          <Text style={styles.tierDescription}>For curious hobbyists</Text>

          <View style={styles.features}>
            <Feature text="Real-time Kp & solar wind" />
            <Feature text="2D aurora map" />
            <Feature text="1 alert per day" />
            <Feature text="7-day history" />
          </View>

          <Pressable
            style={styles.buttonSecondary}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.buttonSecondaryText}>Get Started</Text>
          </Pressable>
        </View>

        {/* Plus Tier */}
        <View style={[styles.card, styles.cardHighlighted]}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Most Popular</Text>
          </View>
          <Text style={styles.tierName}>Plus</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ${annual ? Math.round(STRIPE_CONFIG.tiers.plus.yearlyPrice / 12) : STRIPE_CONFIG.tiers.plus.monthlyPrice}
            </Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.tierDescription}>{STRIPE_CONFIG.tiers.plus.description}</Text>

          <View style={styles.features}>
            {STRIPE_CONFIG.tiers.plus.features.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </View>

          <Pressable
            style={styles.buttonPrimary}
            onPress={() => router.push('/signup?plan=plus')}
          >
            <Text style={styles.buttonPrimaryText}>Start Free Trial</Text>
          </Pressable>
        </View>

        {/* Pro Tier */}
        <View style={styles.card}>
          <Text style={styles.tierName}>Pro</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ${annual ? Math.round(STRIPE_CONFIG.tiers.pro.yearlyPrice / 12) : STRIPE_CONFIG.tiers.pro.monthlyPrice}
            </Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.tierDescription}>{STRIPE_CONFIG.tiers.pro.description}</Text>

          <View style={styles.features}>
            {STRIPE_CONFIG.tiers.pro.features.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </View>

          <Pressable
            style={styles.buttonSecondary}
            onPress={() => router.push('/signup?plan=pro')}
          >
            <Text style={styles.buttonSecondaryText}>Start Free Trial</Text>
          </Pressable>
        </View>

        {/* Enterprise Tier */}
        <View style={styles.card}>
          <Text style={styles.tierName}>Enterprise</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>Custom</Text>
          </View>
          <Text style={styles.tierDescription}>{STRIPE_CONFIG.tiers.enterprise.description}</Text>

          <View style={styles.features}>
            {STRIPE_CONFIG.tiers.enterprise.features.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </View>

          <Pressable
            style={styles.buttonSecondary}
            onPress={() => router.push('/contact')}
          >
            <Text style={styles.buttonSecondaryText}>Contact Sales</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name="checkmark-circle" size={18} color="#00D084" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#E6ECFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#9AA4C2',
    textAlign: 'center',
    marginBottom: 32,
  },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#111833',
    borderRadius: 8,
    padding: 4,
    marginBottom: 48,
  },
  toggleOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: '#00D084',
  },
  toggleText: {
    color: '#9AA4C2',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#0B1020',
  },
  discount: {
    color: '#0B1020',
    fontWeight: '700',
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#111833',
    borderRadius: 12,
    padding: 24,
    width: 280,
    borderWidth: 1,
    borderColor: '#1E2347',
  },
  cardHighlighted: {
    borderColor: '#00D084',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#00D084',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#0B1020',
    fontSize: 12,
    fontWeight: '600',
  },
  tierName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E6ECFF',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: '#E6ECFF',
  },
  period: {
    fontSize: 16,
    color: '#9AA4C2',
    marginLeft: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: '#9AA4C2',
    marginBottom: 24,
  },
  features: {
    gap: 12,
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#E6ECFF',
  },
  buttonPrimary: {
    backgroundColor: '#00D084',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E2347',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Step 4: Create new landing page index**

Rename existing `app/index.tsx` to `app/dashboard.tsx` first, then create new landing:

Run:
```bash
mv app/index.tsx app/dashboard.tsx
```

Create new `app/index.tsx`:
```typescript
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Features } from '@/components/landing/Features';
import { Hero } from '@/components/landing/Hero';
import { Pricing } from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Hero />
        <Features />
        <Pricing />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  content: {
    flex: 1,
  },
});
```

**Step 5: Update app layout for new routes**

This will be done in the next task (Task 8).

**Step 6: Commit**

```bash
git add components/landing/ app/index.tsx app/dashboard.tsx
git commit -m "feat: add landing page with hero, features, and pricing sections"
```

---

## Task 8: Create Auth Pages

**Files:**
- Create: `app/login.tsx`
- Create: `app/signup.tsx`
- Modify: `app/_layout.tsx`

**Step 1: Create login page**

Create `app/login.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/lib/state/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithMagicLink, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(true);

  const handleSubmit = async () => {
    clearError();

    try {
      if (useMagicLink) {
        await signInWithMagicLink(email);
        setMagicLinkSent(true);
      } else {
        await signInWithEmail(email, password);
        router.replace('/dashboard');
      }
    } catch {
      // Error is handled by store
    }
  };

  if (magicLinkSent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="mail-outline" size={48} color="#00D084" style={styles.icon} />
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a magic link to {email}. Click the link to sign in.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setMagicLinkSent(false)}
          >
            <Text style={styles.secondaryButtonText}>Use a different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your SolarStorm account</Text>

        {error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#6B7394"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {!useMagicLink && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#6B7394"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          )}

          <Pressable
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0B1020" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {useMagicLink ? 'Send Magic Link' : 'Sign In'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => setUseMagicLink(!useMagicLink)}>
            <Text style={styles.toggleText}>
              {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/signup" asChild>
            <Pressable>
              <Text style={styles.link}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#111833',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1E2347',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E6ECFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9AA4C2',
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
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
    color: '#E6ECFF',
  },
  input: {
    backgroundColor: '#0B1020',
    borderWidth: 1,
    borderColor: '#1E2347',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#E6ECFF',
  },
  primaryButton: {
    backgroundColor: '#00D084',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E2347',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleText: {
    color: '#00D084',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#9AA4C2',
    fontSize: 14,
  },
  link: {
    color: '#00D084',
    fontSize: 14,
    fontWeight: '500',
  },
});
```

**Step 2: Create signup page**

Create `app/signup.tsx`:
```typescript
import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/lib/state/useAuthStore';

export default function SignupPage() {
  const router = useRouter();
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const { signUpWithEmail, signInWithMagicLink, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(true);

  const handleSubmit = async () => {
    clearError();

    try {
      if (useMagicLink) {
        await signInWithMagicLink(email);
        setMagicLinkSent(true);
      } else {
        await signUpWithEmail(email, password);
        router.replace('/dashboard');
      }
    } catch {
      // Error is handled by store
    }
  };

  if (magicLinkSent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="mail-outline" size={48} color="#00D084" style={styles.icon} />
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a magic link to {email}. Click the link to create your account.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setMagicLinkSent(false)}
          >
            <Text style={styles.secondaryButtonText}>Use a different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          {plan ? `Start your ${plan} plan with a free trial` : 'Get started with SolarStorm for free'}
        </Text>

        {error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#6B7394"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {!useMagicLink && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor="#6B7394"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          )}

          <Pressable
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0B1020" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {useMagicLink ? 'Send Magic Link' : 'Create Account'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => setUseMagicLink(!useMagicLink)}>
            <Text style={styles.toggleText}>
              {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#111833',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1E2347',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E6ECFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9AA4C2',
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
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
    color: '#E6ECFF',
  },
  input: {
    backgroundColor: '#0B1020',
    borderWidth: 1,
    borderColor: '#1E2347',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#E6ECFF',
  },
  primaryButton: {
    backgroundColor: '#00D084',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E2347',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleText: {
    color: '#00D084',
    fontSize: 14,
    textAlign: 'center',
  },
  terms: {
    fontSize: 12,
    color: '#6B7394',
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#9AA4C2',
    fontSize: 14,
  },
  link: {
    color: '#00D084',
    fontSize: 14,
    fontWeight: '500',
  },
});
```

**Step 3: Update app layout**

Replace `app/_layout.tsx`:
```typescript
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuthStore } from '@/lib/state/useAuthStore';

const SolarStormTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#00D084',
    background: '#0B1020',
    card: '#111833',
    text: '#E6ECFF',
    border: '#1E2347',
    notification: '#00D084',
  },
};

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider value={SolarStormTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen
          name="modal-map"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Aurora Map',
            headerStyle: { backgroundColor: '#0B1020' },
            headerTintColor: '#E6ECFF',
          }}
        />
        <Stack.Screen
          name="modal-settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Settings',
            headerStyle: { backgroundColor: '#0B1020' },
            headerTintColor: '#E6ECFF',
          }}
        />
      </Stack>
      <StatusBar style="light" backgroundColor="#0B1020" />
    </ThemeProvider>
  );
}
```

**Step 4: Run tests**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm test
```

Expected: All tests pass (some may need adjustments for new imports)

**Step 5: Commit**

```bash
git add app/login.tsx app/signup.tsx app/_layout.tsx
git commit -m "feat: add auth pages (login, signup) with magic link support"
```

---

## Task 9: Create Pricing Page

**Files:**
- Create: `app/pricing.tsx`

**Step 1: Create pricing page**

Create `app/pricing.tsx`:
```typescript
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Pricing } from '@/components/landing/Pricing';

export default function PricingPage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Pricing />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
});
```

**Step 2: Add to layout**

Update `app/_layout.tsx` to include pricing route:
```typescript
<Stack.Screen name="pricing" />
```

**Step 3: Commit**

```bash
git add app/pricing.tsx app/_layout.tsx
git commit -m "feat: add dedicated pricing page"
```

---

## Task 10: Update Dashboard with Auth Guard

**Files:**
- Modify: `app/dashboard.tsx`

**Step 1: Add auth guard to dashboard**

Update `app/dashboard.tsx` to check authentication and show appropriate content based on tier. Add at the top of the component:

```typescript
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/state/useAuthStore';

// Inside the component:
const { isAuthenticated, isLoading: authLoading } = useAuthStore();

// Early return for auth loading
if (authLoading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#00D084" />
    </View>
  );
}

// Redirect to login if not authenticated
if (!isAuthenticated) {
  return <Redirect href="/login" />;
}
```

**Step 2: Run the app to verify**

Run:
```bash
cd /Users/zach/Projects/active/solarstorm/.worktrees/b2b-phase1 && npm run web
```

Expected: App loads, landing page displays, navigation to auth pages works

**Step 3: Commit**

```bash
git add app/dashboard.tsx
git commit -m "feat: add auth guard to dashboard"
```

---

## Summary

Phase 1 establishes the foundation:

1. **Supabase Integration** - Client, types, database schema
2. **Auth System** - Store, hooks, login/signup pages with magic link
3. **Stripe Setup** - Config, client, pricing tiers
4. **Feature Gating** - Tier definitions, FeatureGate component
5. **Landing Page** - Hero, features, pricing sections
6. **Route Structure** - Public (landing, auth, pricing) + Protected (dashboard)

**Next Steps (Phase 2):**
- 3D Globe with React Three Fiber
- Location-based predictions
- Enhanced alert system
- HF propagation maps

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

**Supabase migrations:**
- Copy SQL to Supabase dashboard SQL editor, or
- Use Supabase CLI: `supabase db push`

**Stripe setup:**
1. Create products in Stripe Dashboard
2. Copy price IDs to `.env.local`
3. Set up webhook endpoint for subscription events
