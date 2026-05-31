import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

// The entitlement identifier configured in RevenueCat that grants paid access.
export const ENTITLEMENT_ID = 'active';

let configured = false;

// Call once at startup. No-ops safely in Expo Go / when the key is missing.
export function configurePurchases(): void {
  if (configured) return;
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (!key) {
    console.warn('[purchases] Missing EXPO_PUBLIC_REVENUECAT_IOS_KEY; subscriptions disabled.');
    return;
  }
  try {
    // iOS-first; an Android key can be added here later.
    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: key });
      configured = true;
    }
  } catch (err) {
    console.warn('[purchases] configure failed (needs a dev build, not Expo Go):', err);
  }
}

// Tie RevenueCat's app_user_id to the Supabase user id so the webhook can map
// entitlements back to the right profile.
export async function identifyUser(userId: string): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.warn('[purchases] logIn failed:', err);
  }
}

export async function deidentifyUser(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // ignore
  }
}

function entitlementActive(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}

// The single monthly package from the current offering (with its 7-day trial).
export async function getMonthlyPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    return current.monthly ?? current.availablePackages[0] ?? null;
  } catch (err) {
    console.warn('[purchases] getOfferings failed:', err);
    return null;
  }
}

export async function purchaseMonthly(): Promise<boolean> {
  const pkg = await getMonthlyPackage();
  if (!pkg) throw new Error('No subscription is available right now.');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return entitlementActive(customerInfo);
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  return entitlementActive(info);
}
