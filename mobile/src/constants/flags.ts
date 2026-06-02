/**
 * Feature flags. Keep subscription UI hidden until RevenueCat products are
 * live in App Store Connect — Apple rejects non-functional purchase flows.
 * Flip to true once IAP is configured and EXPO_PUBLIC_REVENUECAT_IOS_KEY is set.
 */
export const MONETIZATION_ENABLED = false;
