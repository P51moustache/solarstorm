import { create } from 'zustand';
import { getOvation } from '../api/swpc';
import type { OvationCell } from '../api/parsers/ovation';

export interface OvationState {
  cells: OvationCell[];
  updated: string | null;
  isLoading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
}

export const useOvationStore = create<OvationState>()((set) => ({
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
      console.error('Failed to refresh OVATION data:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh aurora data',
        isLoading: false,
      });
    }
  },
}));
