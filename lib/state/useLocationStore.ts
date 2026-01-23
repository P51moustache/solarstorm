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

          const locations = (data || []) as UserLocation[];
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
              .update({ is_primary: false } as unknown as never)
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
            } as unknown as never);

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
            .update({ is_primary: false } as unknown as never)
            .eq('user_id', user.id)
            .eq('is_primary', true);

          // Set new primary
          const { error } = await supabase
            .from('user_locations')
            .update({ is_primary: true } as unknown as never)
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
