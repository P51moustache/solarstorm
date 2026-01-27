'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Zap } from 'lucide-react';
import { TIER_FEATURES, type SubscriptionTier } from '@/lib/features/tiers';

const PLANS: Array<{
  tier: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  description: string;
  featured?: boolean;
}> = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Basic aurora tracking for casual users',
  },
  {
    tier: 'plus',
    name: 'Plus',
    price: '$5',
    period: '/month',
    description: 'Advanced features for aurora enthusiasts',
    featured: true,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$15',
    period: '/month',
    description: 'Professional tools for satellite operators',
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Custom solutions for organizations',
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen gradient-bg">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-solar-muted hover:text-solar-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <Link
          href="/login"
          className="text-solar-muted hover:text-solar-text transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Header */}
      <section className="px-6 py-12 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <Zap className="w-8 h-8 text-solar-emerald" />
          <span className="text-xl font-bold text-solar-text">SolarStorm</span>
        </div>
        <h1 className="text-4xl font-bold text-solar-text mb-4">
          Choose your plan
        </h1>
        <p className="text-xl text-solar-muted max-w-2xl mx-auto">
          Start free and upgrade as you need more features
        </p>
      </section>

      {/* Pricing cards */}
      <section className="px-6 pb-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`rounded-2xl p-6 ${
                plan.featured
                  ? 'bg-solar-emerald/10 border-2 border-solar-emerald'
                  : 'bg-solar-card border border-solar-border'
              }`}
            >
              {plan.featured && (
                <span className="inline-block bg-solar-emerald text-solar-bg text-xs font-semibold px-2 py-1 rounded mb-4">
                  Most Popular
                </span>
              )}

              <h2 className="text-xl font-bold text-solar-text">{plan.name}</h2>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-solar-text">{plan.price}</span>
                <span className="text-solar-muted">{plan.period}</span>
              </div>
              <p className="text-sm text-solar-muted mb-6">{plan.description}</p>

              <Link
                href="/signup"
                className={`block text-center py-3 rounded-xl font-semibold transition-colors ${
                  plan.featured
                    ? 'bg-solar-emerald text-solar-bg hover:bg-opacity-90'
                    : 'bg-solar-border text-solar-text hover:bg-opacity-80'
                }`}
              >
                {plan.tier === 'enterprise' ? 'Contact Us' : 'Get Started'}
              </Link>

              <ul className="mt-6 space-y-3">
                {getFeatureList(plan.tier).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-solar-emerald flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-solar-muted">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function getFeatureList(tier: SubscriptionTier): string[] {
  const features: string[] = [];
  const tierFeatures = TIER_FEATURES[tier];

  if (tierFeatures.locations > 0) {
    features.push(`${tierFeatures.locations === Infinity ? 'Unlimited' : tierFeatures.locations} saved location${tierFeatures.locations > 1 ? 's' : ''}`);
  }
  if (tierFeatures.historicalData) features.push('30-day historical data');
  if (tierFeatures.globe3d) features.push('3D Aurora Globe');
  if (tierFeatures.alertConfig) features.push('Custom alert thresholds');
  if (tierFeatures.advancedCharts) features.push('Advanced charts');
  if (tierFeatures.photoPlanning) features.push('Photo planning tools');
  if (tierFeatures.hfPropagation) features.push('HF propagation maps');
  if (tierFeatures.satellites > 0) {
    features.push(`${tierFeatures.satellites === Infinity ? 'Unlimited' : tierFeatures.satellites} satellite${tierFeatures.satellites > 1 ? 's' : ''}`);
  }
  if (tierFeatures.gnssMonitoring) features.push('GNSS monitoring');
  if (tierFeatures.apiAccess) features.push('API access');

  return features;
}
