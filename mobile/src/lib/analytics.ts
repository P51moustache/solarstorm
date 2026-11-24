/**
 * The app's one door to PostHog: anonymous usage events, screen views and crash reports.
 * Screens and features call `track()` and `useScreenTracking()`; nothing else imports PostHog.
 * Everything is a no-op unless EXPO_PUBLIC_POSTHOG_KEY is set in a non-development build.
 */
import { usePathname } from 'expo-router';
import PostHog from 'posthog-react-native';
import { useEffect } from 'react';

import {
  AnalyticsEnv,
  AnalyticsEventName,
  AnalyticsProps,
  analyticsEnabled,
  posthogOptions,
} from '@/lib/analyticsConfig';

const env: AnalyticsEnv = {
  key: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  isDev: __DEV__,
};

// Created at load so crashes during startup are caught too.
const client: PostHog | null = analyticsEnabled(env) ? new PostHog(env.key!, posthogOptions(env)) : null;

/** Records one named event. Properties must never carry location, place names or typed text. */
export function track(event: AnalyticsEventName, props?: AnalyticsProps): void {
  client?.capture(event, props);
}

/** Records a screen view each time the expo-router path changes. Mount once, in the root layout. */
export function useScreenTracking(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) client?.screen(pathname);
  }, [pathname]);
}
