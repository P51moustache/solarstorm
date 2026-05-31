import { create } from 'zustand';
import {
  generateApiKey,
  getUserApiKeys,
  deleteApiKey,
  type ApiKey,
} from '@/lib/services/apiKeys';

interface ApiKeyState {
  keys: ApiKey[];
  isLoading: boolean;
  error: string | null;
  newKeySecret: string | null; // Temporary storage for newly created key

  // Actions
  fetchKeys: (userId: string) => void;
  createKey: (userId: string, name: string, tier?: 'pro') => Promise<string | null>;
  removeKey: (keyId: string, userId: string) => void;
  clearNewKeySecret: () => void;
}

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  keys: [],
  isLoading: false,
  error: null,
  newKeySecret: null,

  fetchKeys: (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const keys = getUserApiKeys(userId);
      set({ keys, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch API keys',
        isLoading: false,
      });
    }
  },

  createKey: async (userId: string, name: string, tier: 'pro' = 'pro') => {
    set({ isLoading: true, error: null });
    try {
      const result = await generateApiKey(userId, name, tier);
      const keys = getUserApiKeys(userId);
      set({
        keys,
        newKeySecret: result.fullKey,
        isLoading: false,
      });
      return result.fullKey;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create API key',
        isLoading: false,
      });
      return null;
    }
  },

  removeKey: (keyId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      deleteApiKey(keyId, userId);
      const keys = getUserApiKeys(userId);
      set({ keys, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete API key',
        isLoading: false,
      });
    }
  },

  clearNewKeySecret: () => {
    set({ newKeySecret: null });
  },
}));
