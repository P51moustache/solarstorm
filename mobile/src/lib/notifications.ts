import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Show notifications even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.status === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Present a local notification immediately (used from the background task). */
export async function present(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

// ---- Dedupe state so we don't re-notify the same event repeatedly ----

const STATE_KEY = 'solarstorm.notifyState.v1';

export interface NotifyState {
  lastStormAt?: number;
  lastStormKp?: number;
  lastFlare?: string;
  lastSScale?: number;
  lastDigestDate?: string; // YYYY-MM-DD (local)
  lastWeeklyAt?: number;
  lastWeeklyPeak?: number;
}

export async function getNotifyState(): Promise<NotifyState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as NotifyState) : {};
  } catch {
    return {};
  }
}

export async function setNotifyState(state: NotifyState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}
