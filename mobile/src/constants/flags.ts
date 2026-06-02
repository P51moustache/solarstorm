/**
 * Feature flags. Keep subscription UI hidden until RevenueCat products are
 * live in App Store Connect — Apple rejects non-functional purchase flows.
 * Flip to true once IAP is configured and EXPO_PUBLIC_REVENUECAT_IOS_KEY is set.
 */
export const MONETIZATION_ENABLED = false;

/**
 * Accounts (Supabase auth) are off for v1. Apple Guideline 5.1.1(v) requires
 * in-app account *deletion* whenever account *creation* is offered, which needs
 * a backend (service-role) delete function we haven't built. Accounts add no
 * v1 value (no monetization; saved data is device-local), so we hide them until
 * deletion + sync are ready. Flip to true once a delete-account flow exists.
 */
export const ACCOUNTS_ENABLED = false;
