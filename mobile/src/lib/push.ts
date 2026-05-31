import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// How notifications behave while the app is foregrounded.
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // @ts-expect-error easConfig is present in some runtimes
    Constants.easConfig?.projectId
  );
}

/**
 * Requests notification permission, obtains an Expo push token, and upserts it
 * into device_tokens so the poll-and-notify function can reach this device.
 * Safe to call on every launch; no-ops on simulators and when permission is
 * denied. Returns true if a token was registered.
 */
export async function registerForPushNotifications(userId: string): Promise<boolean> {
  // Push tokens are only issued to physical devices.
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return false;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn(
      '[push] Missing EAS projectId. Run `eas init` / `eas build:configure` and set ' +
        'expo.extra.eas.projectId in app.json before push tokens can be issued.',
    );
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Space-weather alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let expoToken: string;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    expoToken = tokenData.data;
  } catch (err) {
    console.warn('[push] Failed to get Expo push token:', err);
    return false;
  }

  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      expo_token: expoToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    },
    { onConflict: 'user_id,expo_token' },
  );

  if (error) {
    console.warn('[push] Failed to save device token:', error.message);
    return false;
  }
  return true;
}
