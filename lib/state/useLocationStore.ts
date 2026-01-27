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

// Dev mode bypass for testing (only in development)
// In dev mode, use localStorage since the mock user doesn't exist in Supabase
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

interface LocationState {
  // Current device location
  currentLocation: UserCoordinates | null;
  magneticLatitude: number | null;

  // Saved locations (Supabase in prod, localStorage in dev)
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
        // In dev bypass mode, locations are already in state via persist
        if (DEV_BYPASS_AUTH) {
          const { savedLocations } = get();
          const primary = savedLocations.find((l) => l.is_primary) || null;
          set({ primaryLocation: primary });
          return;
        }

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
          // In dev bypass mode, use localStorage
          if (DEV_BYPASS_AUTH) {
            const { savedLocations } = get();

            // If setting as primary, unset existing primary
            let updatedLocations = savedLocations;
            if (isPrimary) {
              updatedLocations = savedLocations.map((loc) => ({
                ...loc,
                is_primary: false,
              }));
            }

            // Create new location
            const newLocation: UserLocation = {
              id: crypto.randomUUID(),
              user_id: 'dev-user',
              label,
              lat,
              lng,
              is_primary: isPrimary || savedLocations.length === 0,
              created_at: new Date().toISOString(),
            };

            const newLocations = [newLocation, ...updatedLocations];
            const primary = newLocations.find((l) => l.is_primary) || null;

            set({
              savedLocations: newLocations,
              primaryLocation: primary,
              isLoading: false
            });
            return;
          }

          // Production: use Supabase
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
          // In dev bypass mode, use localStorage
          if (DEV_BYPASS_AUTH) {
            const { savedLocations } = get();
            const newLocations = savedLocations.filter((loc) => loc.id !== id);

            // If we removed the primary, set the first remaining as primary
            let primary = newLocations.find((l) => l.is_primary) || null;
            if (!primary && newLocations.length > 0) {
              newLocations[0].is_primary = true;
              primary = newLocations[0];
            }

            set({ savedLocations: newLocations, primaryLocation: primary });
            return;
          }

          // Production: use Supabase
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
          // In dev bypass mode, use localStorage
          if (DEV_BYPASS_AUTH) {
            const { savedLocations } = get();

            const newLocations = savedLocations.map((loc) => ({
              ...loc,
              is_primary: loc.id === id,
            }));

            const primary = newLocations.find((l) => l.is_primary) || null;
            set({ savedLocations: newLocations, primaryLocation: primary });
            return;
          }

          // Production: use Supabase
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
        // In dev mode, also persist saved locations to localStorage
        ...(DEV_BYPASS_AUTH ? {
          savedLocations: state.savedLocations,
          primaryLocation: state.primaryLocation,
        } : {}),
      }),
    }
  )
);
