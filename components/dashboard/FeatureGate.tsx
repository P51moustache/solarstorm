'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuthStore } from '@/lib/state/useAuthStore';
import { hasFeature, type FeatureKey } from '@/lib/features/tiers';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  showUpgrade?: boolean;
  fallback?: ReactNode;
}

export function FeatureGate({
  feature,
  children,
  showUpgrade = false,
  fallback,
}: FeatureGateProps) {
  const tier = useAuthStore((state) => state.tier);
  const canAccess = hasFeature(tier, feature);

  if (canAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgrade) {
    return (
      <div className="relative">
        <div className="opacity-40 pointer-events-none blur-sm">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Link
            href="/pricing"
            className="flex items-center gap-2 bg-solar-card/90 backdrop-blur px-4 py-2 rounded-xl border border-solar-border hover:border-solar-emerald transition-colors"
          >
            <Lock className="w-4 h-4 text-solar-emerald" />
            <span className="text-sm font-medium text-solar-text">
              Upgrade to unlock
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
