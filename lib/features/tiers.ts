import type { SubscriptionTier } from '../supabase/types';

export const TIER_FEATURES = {
  free: {
    alertsPerDay: 1,
    historyDays: 7,
    locations: 1,
    globe3d: false,
    locationPredictions: false,
    hfPropagation: false,
    photoPlanning: false,
    historicalData: false,
    satelliteRisk: false,
    apiAccess: false,
    dataExport: false,
  },
  plus: {
    alertsPerDay: Infinity,
    historyDays: 90,
    locations: 5,
    globe3d: true,
    locationPredictions: true,
    hfPropagation: true,
    photoPlanning: true,
    historicalData: true,
    satelliteRisk: false,
    apiAccess: false,
    dataExport: false,
  },
  pro: {
    alertsPerDay: Infinity,
    historyDays: 730, // 2 years
    locations: 20,
    globe3d: true,
    locationPredictions: true,
    hfPropagation: true,
    photoPlanning: true,
    historicalData: true,
    satelliteRisk: true,
    apiAccess: true,
    dataExport: true,
  },
  enterprise: {
    alertsPerDay: Infinity,
    historyDays: 730,
    locations: Infinity,
    globe3d: true,
    locationPredictions: true,
    hfPropagation: true,
    photoPlanning: true,
    historicalData: true,
    satelliteRisk: true,
    apiAccess: true,
    dataExport: true,
  },
} as const;

export type FeatureKey = keyof typeof TIER_FEATURES.free;

export function hasFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return Boolean(TIER_FEATURES[tier][feature]);
}

export function getFeatureLimit(tier: SubscriptionTier, feature: FeatureKey): number {
  const value = TIER_FEATURES[tier][feature];
  return typeof value === 'number' ? value : 0;
}

export function getUpgradeTier(currentTier: SubscriptionTier, feature: FeatureKey): SubscriptionTier | null {
  const tiers: SubscriptionTier[] = ['free', 'plus', 'pro', 'enterprise'];
  const currentIndex = tiers.indexOf(currentTier);

  for (let i = currentIndex + 1; i < tiers.length; i++) {
    if (hasFeature(tiers[i], feature)) {
      return tiers[i];
    }
  }

  return null;
}
