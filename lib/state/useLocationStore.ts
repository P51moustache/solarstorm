import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { asyncStorage } from './persist';
import {
  calculateMagneticLatitude,
  getCurrentLocation,
  type UserCoordinates,
} from '../services/location';

// Local storage type for saved locations
export interface SavedLocation {
  id: string;
  label: string;
  lat: number;
  lng: number;
  is_primary: boolean;
  created_at: string;
}

interface LocationState {
  // Current device location
  currentLocation: UserCoordinates | null;
  magneticLatitude: number | null;

  // Saved locations (localStorage)
  savedLocations: SavedLocation[];
  primaryLocation: SavedLocation | null;

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
        // Locations are stored in localStorage via zustand persist
        // Just update primaryLocation from current savedLocations
        const { savedLocations } = get();
        const primary = savedLocations.find((l) => l.is_primary) || null;
        set({ primaryLocation: primary });
      },

      addLocation: async (label, lat, lng, isPrimary = false) => {
        set({ isLoading: true, error: null });
        try {
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
          const newLocation: SavedLocation = {
            id: crypto.randomUUID(),
            label,
            lat,
            lng,
            is_primary: isPrimary || savedLocations.length === 0, // First location is primary by default
            created_at: new Date().toISOString(),
          };

          const newLocations = [newLocation, ...updatedLocations];
          const primary = newLocations.find((l) => l.is_primary) || null;

          set({
            savedLocations: newLocations,
            primaryLocation: primary,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add location',
            isLoading: false,
          });
        }
      },

      removeLocation: async (id) => {
        try {
          const { savedLocations } = get();
          const newLocations = savedLocations.filter((loc) => loc.id !== id);

          // If we removed the primary, set the first remaining as primary
          let primary = newLocations.find((l) => l.is_primary) || null;
          if (!primary && newLocations.length > 0) {
            newLocations[0].is_primary = true;
            primary = newLocations[0];
          }

          set({ savedLocations: newLocations, primaryLocation: primary });
        } catch (error) {
          console.error('Failed to remove location:', error);
        }
      },

      setPrimaryLocation: async (id) => {
        try {
          const { savedLocations } = get();

          // Update all locations: unset existing primary, set new one
          const newLocations = savedLocations.map((loc) => ({
            ...loc,
            is_primary: loc.id === id,
          }));

          const primary = newLocations.find((l) => l.is_primary) || null;
          set({ savedLocations: newLocations, primaryLocation: primary });
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
        savedLocations: state.savedLocations,
        primaryLocation: state.primaryLocation,
      }),
    }
  )
);
