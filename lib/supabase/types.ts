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
