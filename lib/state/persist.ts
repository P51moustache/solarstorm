import { StateStorage } from 'zustand/middleware';

const isClient = typeof window !== 'undefined';

export const asyncStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(name);
    } catch (error) {
      console.error(`Failed to get item from storage: ${name}`, error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!isClient) return;
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.error(`Failed to set item in storage: ${name}`, error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isClient) return;
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.error(`Failed to remove item from storage: ${name}`, error);
    }
  },
};
