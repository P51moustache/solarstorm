export const STRIPE_CONFIG = {
  prices: {
    plus_monthly: process.env.EXPO_PUBLIC_STRIPE_PLUS_MONTHLY_PRICE_ID || '',
    plus_yearly: process.env.EXPO_PUBLIC_STRIPE_PLUS_YEARLY_PRICE_ID || '',
    pro_monthly: process.env.EXPO_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    pro_yearly: process.env.EXPO_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
    enterprise_monthly: process.env.EXPO_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '',
  },
  tiers: {
    plus: {
      name: 'Plus',
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      description: 'For aurora enthusiasts and ham radio operators',
      features: [
        '3D Interactive Globe',
        'Location-based predictions',
        'Unlimited smart alerts',
        'HF propagation maps',
        '90-day history',
      ],
    },
    pro: {
      name: 'Pro',
      monthlyPrice: 49,
      yearlyPrice: 490,
      description: 'For satellite operators and professionals',
      features: [
        'Everything in Plus',
        'Satellite fleet manager',
        'Drag risk calculator',
        'Safe mode recommendations',
        'API access (1000 req/day)',
        '2-year history',
      ],
    },
    enterprise: {
      name: 'Enterprise',
      monthlyPrice: 199,
      yearlyPrice: null, // Custom pricing
      description: 'For large teams and critical infrastructure',
      features: [
        'Everything in Pro',
        'Team management & SSO',
        'Custom alert rules',
        'Webhook integrations',
        'SLA guarantee',
        'Dedicated support',
      ],
    },
  },
} as const;
