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
      set({ satellites: (data || []) as Satellite[], isLoading: false });
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
      set({ anomalies: (data || []) as SatelliteAnomaly[] });
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

      const newSatellite = data as Satellite;
      set((state) => ({
        satellites: [...state.satellites, newSatellite],
        isLoading: false,
      }));

      return newSatellite;
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
          kp_at_time: (kpData as { value: number } | null)?.value ?? null,
          proton_flux_at_time: (protonData as { flux_10mev: number } | null)?.flux_10mev ?? null,
          electron_flux_at_time: (electronData as { flux_2mev: number } | null)?.flux_2mev ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        anomalies: [data as SatelliteAnomaly, ...state.anomalies],
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
