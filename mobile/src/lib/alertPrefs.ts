import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'solarstorm.alertPrefs.v1';

export interface AlertPrefs {
  enabled: boolean;
  kpThreshold: number; // alert when Kp reaches this
  requireBz: boolean; // only alert when Bz is southward (< 0)
}

export const DEFAULT_PREFS: AlertPrefs = { enabled: true, kpThreshold: 5, requireBz: true };

export async function getAlertPrefs(): Promise<AlertPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveAlertPrefs(prefs: AlertPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // best-effort
  }
}

/** Would the current conditions trigger the user's alert right now? */
export function alertWouldFire(
  prefs: AlertPrefs,
  kp: number | null,
  bz: number | null
): boolean {
  if (!prefs.enabled || kp === null) return false;
  if (kp < prefs.kpThreshold) return false;
  if (prefs.requireBz && !(bz != null && bz < 0)) return false;
  return true;
}
