import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return await requestWebNotificationPermission();
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  return true;
}

// Web Push Notifications Support
async function requestWebNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function showWebNotification(
  title: string,
  body: string,
  options?: { icon?: string; tag?: string; requireInteraction?: boolean }
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    const granted = await requestWebNotificationPermission();
    if (!granted) return;
  }

  const notification = new Notification(title, {
    body,
    icon: options?.icon ?? '/icon.png',
    tag: options?.tag,
    requireInteraction: options?.requireInteraction ?? false,
    badge: '/icon.png',
  });

  // Auto-close after 10 seconds if not requiring interaction
  if (!options?.requireInteraction) {
    setTimeout(() => notification.close(), 10000);
  }
}

export async function scheduleNotification(
  title: string,
  body: string,
  options?: { tag?: string; requireInteraction?: boolean }
): Promise<string | null> {
  try {
    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission) return null;

    // Use Web Notifications API on web platform
    if (Platform.OS === 'web') {
      await showWebNotification(title, body, {
        tag: options?.tag,
        requireInteraction: options?.requireInteraction,
      });
      return options?.tag ?? `web-${Date.now()}`;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}

export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
