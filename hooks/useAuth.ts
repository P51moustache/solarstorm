import { useEffect } from 'react';
import { useAuthStore } from '@/lib/state/useAuthStore';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    store.initialize();
  }, []);

  return store;
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();

  return { isAuthenticated, isLoading };
}

export function useTier() {
  return useAuthStore((state) => state.tier);
}

export function useIsPro() {
  const tier = useTier();
  return tier === 'pro' || tier === 'enterprise';
}

export function useIsPlus() {
  const tier = useTier();
  return tier === 'plus' || tier === 'pro' || tier === 'enterprise';
}

export function useIsEnterprise() {
  const tier = useTier();
  return tier === 'enterprise';
}
