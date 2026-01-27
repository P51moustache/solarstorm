import type { AlertConfig } from '../supabase/types';

const LAST_ALERT_KEY = 'alerts:lastTriggered';
const COOLDOWN_MINUTES = 60; // Minimum time between same alert type

const isClient = typeof window !== 'undefined';

interface SpaceWeatherData {
  kp: number;
  bz: number;
  speed: number;
}

interface LastAlertRecord {
  kp?: number;
  bz?: number;
  speed?: number;
  timestamp?: string;
}

export async function checkAndNotify(
  config: AlertConfig | null,
  data: SpaceWeatherData
): Promise<void> {
  if (!isClient) return;

  // Only check if push notifications are enabled
  if (!config?.push_enabled) return;

  const lastAlert = getLastAlertRecord();
  const now = new Date();

  // Check cooldown
  if (lastAlert.timestamp) {
    const timeSinceLastAlert =
      (now.getTime() - new Date(lastAlert.timestamp).getTime()) / (1000 * 60);
    if (timeSinceLastAlert < COOLDOWN_MINUTES) {
      return;
    }
  }

  const alerts: { title: string; body: string; tag: string }[] = [];

  // Check Kp threshold
  if (data.kp >= config.kp_threshold && data.kp > (lastAlert.kp ?? 0)) {
    alerts.push({
      title: 'Aurora Alert!',
      body: `Kp index has reached ${data.kp}. Check for aurora activity in your area!`,
      tag: 'kp-alert',
    });
  }

  // Check Bz threshold (negative Bz is good for aurora)
  const bzThreshold = config.bz_threshold ?? -5;
  if (data.bz <= bzThreshold && data.bz < (lastAlert.bz ?? 0)) {
    alerts.push({
      title: 'Southward Bz Alert',
      body: `IMF Bz has dropped to ${data.bz.toFixed(1)} nT. Favorable conditions for aurora!`,
      tag: 'bz-alert',
    });
  }

  // Check solar wind speed threshold (use default of 500 km/s)
  const speedThreshold = 500;
  if (data.speed >= speedThreshold && data.speed > (lastAlert.speed ?? 0)) {
    alerts.push({
      title: 'Solar Wind Alert',
      body: `Solar wind speed has reached ${Math.round(data.speed)} km/s. Enhanced aurora possible!`,
      tag: 'speed-alert',
    });
  }

  // Send notifications using Web Notifications API
  for (const alert of alerts) {
    await showWebNotification(alert.title, alert.body, alert.tag);
  }

  // Update last alert record
  if (alerts.length > 0) {
    setLastAlertRecord({
      kp: data.kp,
      bz: data.bz,
      speed: data.speed,
      timestamp: now.toISOString(),
    });
  }
}

async function showWebNotification(
  title: string,
  body: string,
  tag: string
): Promise<void> {
  if (!isClient || !('Notification' in window)) return;

  // Request permission if not already granted
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      tag,
      icon: '/favicon.ico',
      requireInteraction: true,
    });
  }
}

function getLastAlertRecord(): LastAlertRecord {
  if (!isClient) return {};

  try {
    const stored = localStorage.getItem(LAST_ALERT_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setLastAlertRecord(record: LastAlertRecord): void {
  if (!isClient) return;

  try {
    localStorage.setItem(LAST_ALERT_KEY, JSON.stringify(record));
  } catch (error) {
    console.error('Failed to save alert record:', error);
  }
}

export async function sendTestNotification(): Promise<void> {
  await showWebNotification(
    'Test Notification',
    'Your aurora alerts are working! You\'ll be notified when conditions match your thresholds.',
    'test-alert'
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isClient || !('Notification' in window)) {
    return 'denied';
  }

  return Notification.requestPermission();
}
