/**
 * RevenueCat (Apple IAP) wrapper.
 *
 * `react-native-purchases` is a native module that is NOT present in Expo Go.
 * Everything here is guarded by `purchasesAvailable` and uses a dynamic import,
 * so the app runs fine in Expo Go (purchasing simply reports "unavailable") and
 * activates for real once you build a dev/standalone client with the key set.
 */
import Constants from 'expo-constants';

// `appOwnership === 'expo'` only in Expo Go; null/standalone in dev & production builds.
export const purchasesAvailable = Constants.appOwnership !== 'expo';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

let configured = false;

async function loadPurchases(): Promise<any | null> {
  if (!purchasesAvailable || !IOS_KEY) return null;
  try {
    const mod: any = await import('react-native-purchases');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

export interface OfferingPackage {
  identifier: string;
  title: string;
  priceString: string;
}

export async function configurePurchases(appUserId?: string | null): Promise<void> {
  if (configured) return;
  const Purchases = await loadPurchases();
  if (!Purchases) return;
  Purchases.configure({ apiKey: IOS_KEY, appUserID: appUserId ?? null });
  configured = true;
}

export async function fetchPackages(): Promise<OfferingPackage[]> {
  const Purchases = await loadPurchases();
  if (!Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    return pkgs.map((p: any) => ({
      identifier: p.identifier,
      title: p.product.title,
      priceString: p.product.priceString,
    }));
  } catch {
    return [];
  }
}

export async function purchasePackage(identifier: string): Promise<{ entitled: boolean; error?: string }> {
  const Purchases = await loadPurchases();
  if (!Purchases) return { entitled: false, error: 'In-app purchases require a dev build.' };
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages?.find((p: any) => p.identifier === identifier);
    if (!pkg) return { entitled: false, error: 'Package not found.' };
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { entitled: Object.keys(customerInfo.entitlements.active).length > 0 };
  } catch (e: any) {
    if (e?.userCancelled) return { entitled: false };
    return { entitled: false, error: e?.message ?? 'Purchase failed.' };
  }
}

export async function restorePurchases(): Promise<{ entitled: boolean; error?: string }> {
  const Purchases = await loadPurchases();
  if (!Purchases) return { entitled: false, error: 'In-app purchases require a dev build.' };
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { entitled: Object.keys(customerInfo.entitlements.active).length > 0 };
  } catch (e: any) {
    return { entitled: false, error: e?.message ?? 'Restore failed.' };
  }
}
