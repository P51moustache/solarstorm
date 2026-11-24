/**
 * What SolarStorm reports to PostHog, as plain data so tests can read it.
 *
 * Privacy contract (mirrored in PRIVACY.md and docs/privacy.html; change all three together):
 *  - anonymous: a random install id only, no person profiles, never identify();
 *  - no IP geolocation, no session replay, no touch autocapture, no console capture;
 *  - no coordinates, place names or search text in any event property;
 *  - nothing is sent from development builds or when no project key is set.
 */

/** Events the app sends by hand. Screens and app open/background are captured automatically. */
export const AnalyticsEvent = {
  onboardingCompleted: 'onboarding_completed',
  alertsToggled: 'alerts_toggled',
  placeSaved: 'place_saved',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/** Event properties are limited to flags, small numbers and short labels: no free text. */
export type AnalyticsProps = Record<string, boolean | number | 'search' | 'device'>;

/** PostHog's US cloud; override with EXPO_PUBLIC_POSTHOG_HOST for the EU cloud. */
export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export interface AnalyticsEnv {
  key?: string;
  host?: string;
  isDev: boolean;
}

/** Whether this build may send anything at all. */
export function analyticsEnabled(env: AnalyticsEnv): boolean {
  return Boolean(env.key && env.key.trim()) && !env.isDev;
}

/** Options for `new PostHog(key, options)`, fixed by the privacy contract above. */
export function posthogOptions(env: AnalyticsEnv) {
  return {
    host: env.host?.trim() || DEFAULT_POSTHOG_HOST,
    personProfiles: 'never' as const,
    disableGeoip: true,
    enableSessionReplay: false,
    captureAppLifecycleEvents: true,
    errorTracking: {
      autocapture: {
        uncaughtExceptions: true,
        unhandledRejections: true,
        console: false,
        nativeCrashes: true,
      },
    },
  };
}
