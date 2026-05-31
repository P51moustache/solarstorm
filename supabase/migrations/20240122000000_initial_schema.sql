-- gen_random_uuid() is built into PostgreSQL 13+ (no extension needed)

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus', 'pro')),
  stripe_customer_id TEXT,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus', 'pro')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for org_id
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_org
FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Organization members (for team collaboration)
CREATE TABLE public.org_members (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Alert configurations
CREATE TABLE public.alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert log (for tracking sent alerts and enforcing limits)
CREATE TABLE public.alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  payload JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Push notification subscriptions (for browser push)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
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
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
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

-- Push subscriptions policies
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
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
