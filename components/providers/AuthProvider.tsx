'use client';

import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/lib/state/useAuthStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show loading state while auth initializes
  if (isLoading) {
    return (
      <div className="min-h-screen bg-solar-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
