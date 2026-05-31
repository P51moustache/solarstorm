'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout, TopBar } from '@/components/layout';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { HfPropagationMap } from '@/components/charts/HfPropagationMap';
import { useAuthStore } from '@/lib/state/useAuthStore';

export default function HfPropagationPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060910] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <TopBar
        title="HF Propagation"
        subtitle="Real-time amateur radio band conditions"
      />

      <div className="p-6">
        <FeatureGate feature="hfPropagation" showUpgrade>
          <HfPropagationMap />
        </FeatureGate>
      </div>
    </AppLayout>
  );
}
