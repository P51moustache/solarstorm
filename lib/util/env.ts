/**
 * Environment variable validation
 * Call this at app startup to ensure all required env vars are set
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const optionalEnvVars = [
  'NASA_API_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_OPENWEATHER_API_KEY',
  'NEXT_PUBLIC_DEV_BYPASS_AUTH',
] as const;

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function getEnvWarnings(): string[] {
  const warnings: string[] = [];

  // Check for development-only settings in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
      warnings.push('WARNING: DEV_BYPASS_AUTH is enabled in production!');
    }
  }

  // Check for missing optional but recommended vars
  if (!process.env.NASA_API_KEY) {
    warnings.push('NASA_API_KEY not set, using DEMO_KEY (rate limited)');
  }

  return warnings;
}

// Type-safe env access
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  nasa: {
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;
