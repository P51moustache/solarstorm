import { create } from 'zustand';
import { supabase } from '../supabase/client';
import type { GnssRegion } from '../supabase/types';
import { getTecStatus, type TecStatus } from '../api/tec';
import { getScintillationStatus, type ScintillationStatus } from '../api/scintillation';
import { getConstellationStatus } from '../api/gnssConstellation';
import type { AllConstellationsStatus } from '../api/parsers/gnssConstellation';

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

      const regions = (data || []) as GnssRegion[];
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
          .update({ is_primary: false } as unknown as never)
          .eq('user_id', user.id)
          .eq('is_primary', true);
      }

      const insertData = { ...region, user_id: user.id };
      const { error } = await supabase
        .from('gnss_regions')
        .insert(insertData as unknown as never);

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
        .update(updates as unknown as never)
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
        .update({ is_primary: false } as unknown as never)
        .eq('user_id', user.id)
        .eq('is_primary', true);

      // Set new primary
      const { error } = await supabase
        .from('gnss_regions')
        .update({ is_primary: true } as unknown as never)
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
