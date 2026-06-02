import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'solarstorm.alertPrefs.v2';

export interface AlertPrefs {
  notificationsEnabled: boolean; // master switch (set once permission granted)
  storm: boolean; // geomagnetic storm crosses threshold
  kpThreshold: number;
  requireBz: boolean; // only when Bz southward
  flares: boolean; // M/X flares + S2+ radiation storms
  dailyDigest: boolean;
  digestHour: number; // 0-23, local
  weekly: boolean; // heads-up when the 2-week outlook is elevated
}

export const DEFAULT_PREFS: AlertPrefs = {
  notificationsEnabled: false,
  storm: true,
  kpThreshold: 5,
  requireBz: true,
  flares: true,
  dailyDigest: false,
  digestHour: 8,
  weekly: true,
};

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

/** Would current conditions trigger the user's storm alert right now? */
export function alertWouldFire(prefs: AlertPrefs, kp: number | null, bz: number | null): boolean {
  if (!prefs.storm || kp === null) return false;
  if (kp < prefs.kpThreshold) return false;
  if (prefs.requireBz && !(bz != null && bz < 0)) return false;
  return true;
}
