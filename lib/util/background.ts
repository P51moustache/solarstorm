import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { getKpNow, getSolarWindRecent } from '../api/swpc';
import { scheduleNotification } from './notifications';
import { dayjs } from './time';

const BACKGROUND_FETCH_TASK = 'SOLARSTORM_FETCH';
const BZ_HISTORY_KEY = 'bz_history';
const ALERT_COOLDOWN_KEY = 'alert_cooldown';
const COOLDOWN_DURATION = 90 * 60 * 1000; // 90 minutes in milliseconds

interface BzEntry {
  value: number;
  timestamp: string;
}

interface BackgroundFetchSettings {
  bzGateEnabled: boolean;
  kpThreshold: number;
  interval: number;
}

const DEFAULT_SETTINGS: BackgroundFetchSettings = {
  bzGateEnabled: true,
  kpThreshold: 5,
  interval: 900, // 15 minutes (APP_PLAN requirement)
};

async function getSettings(): Promise<BackgroundFetchSettings> {
  try {
    const settings = await AsyncStorage.getItem('background_fetch_settings');
    return settings ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('Background fetch executing...');
    
    // Check if we're in cooldown period
    const lastAlert = await AsyncStorage.getItem(ALERT_COOLDOWN_KEY);
    if (lastAlert) {
      const timeSinceAlert = Date.now() - parseInt(lastAlert);
      if (timeSinceAlert < COOLDOWN_DURATION) {
        console.log('Still in cooldown period, skipping alert check');
        return { result: 'newData' };
      }
    }

    // Get settings
    const settings = await getSettings();
    
    if (settings.kpThreshold === 0) {
      console.log('Notifications disabled');
      return { result: 'newData' };
    }

    // Fetch current data
    const [kpData, solarWindData] = await Promise.all([
      getKpNow(),
      getSolarWindRecent(),
    ]);

    if (!kpData || !solarWindData) {
      console.log('Failed to fetch background data');
      return { result: 'failed' };
    }

    // Check for high Kp
    if (kpData.kp >= settings.kpThreshold) {
      await scheduleNotification(
        '🌟 Aurora Alert!',
        `High geomagnetic activity detected (Kp=${kpData.kp.toFixed(1)}). Aurora may be visible!`
      );
      await AsyncStorage.setItem(ALERT_COOLDOWN_KEY, Date.now().toString());
      return { result: 'newData' };
    }

    // Check Bz gate logic if enabled
    if (settings.bzGateEnabled) {
      // APP_PLAN: "Bz ≤ −5 nT for at least 10 minutes"
      // Look for 10+ minutes of consecutive Bz ≤ -5 nT
      const recentBz = solarWindData.points
        .filter((point: any) => point.bz !== null)
        .map((point: any) => ({ value: point.bz!, timestamp: point.at }))
        .slice(-20); // Last ~100 minutes of data (5-min intervals)
      
      if (recentBz.length >= 3) { // Need at least 15 minutes of data (3 x 5-min intervals)
        // Find consecutive periods where Bz ≤ -5 nT
        let consecutiveMinutes = 0;
        let maxConsecutiveMinutes = 0;
        
        for (let i = recentBz.length - 1; i >= 0; i--) {
          if (recentBz[i].value <= -5) {
            consecutiveMinutes += 5; // Each data point is ~5 minutes
            maxConsecutiveMinutes = Math.max(maxConsecutiveMinutes, consecutiveMinutes);
          } else {
            consecutiveMinutes = 0;
          }
        }
        
        // Trigger if we have 10+ minutes of Bz ≤ -5 nT
        if (maxConsecutiveMinutes >= 10) {
          // Store this event in history
          const history: BzEntry[] = JSON.parse(
            await AsyncStorage.getItem(BZ_HISTORY_KEY) || '[]'
          );
          
          const newEntry: BzEntry = {
            value: recentBz[recentBz.length - 1].value,
            timestamp: new Date().toISOString(),
          };
          
          history.push(newEntry);
          
          // Keep only last 24 hours of data
          const cutoff = dayjs().subtract(24, 'hours').toISOString();
          const filteredHistory = history.filter(entry => entry.timestamp > cutoff);
          
          await AsyncStorage.setItem(BZ_HISTORY_KEY, JSON.stringify(filteredHistory));
          
          // Send notification
          await scheduleNotification(
            '⚡ Solar Wind Alert!',
            `Strong southward Bz detected (${newEntry.value.toFixed(1)} nT). Aurora activity may increase in 30-60 minutes.`
          );
          
          await AsyncStorage.setItem(ALERT_COOLDOWN_KEY, Date.now().toString());
        }
      }
    }

    return { result: 'newData' };
  } catch (error) {
    console.error('Background fetch error:', error);
    return { result: 'failed' };
  }
});

export async function getBzHistory(): Promise<BzEntry[]> {
  try {
    const history = await AsyncStorage.getItem(BZ_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to get Bz history:', error);
    return [];
  }
}

export async function clearBzHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BZ_HISTORY_KEY);
    console.log('Bz history cleared');
  } catch (error) {
    console.error('Failed to clear Bz history:', error);
  }
}

export async function getAlertCooldownStatus(): Promise<{
  inCooldown: boolean;
  timeRemaining?: number;
}> {
  try {
    const lastAlert = await AsyncStorage.getItem(ALERT_COOLDOWN_KEY);
    if (!lastAlert) {
      return { inCooldown: false };
    }

    const timeSinceAlert = Date.now() - parseInt(lastAlert);
    if (timeSinceAlert >= COOLDOWN_DURATION) {
      return { inCooldown: false };
    }

    return {
      inCooldown: true,
      timeRemaining: COOLDOWN_DURATION - timeSinceAlert,
    };
  } catch (error) {
    console.error('Failed to get cooldown status:', error);
    return { inCooldown: false };
  }
}

export async function clearAlertCooldown(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ALERT_COOLDOWN_KEY);
    console.log('Alert cooldown cleared');
  } catch (error) {
    console.error('Failed to clear alert cooldown:', error);
  }
}

export async function getBackgroundFetchSettings(): Promise<BackgroundFetchSettings> {
  return await getSettings();
}

export async function setBackgroundFetchSettings(settings: Partial<BackgroundFetchSettings>): Promise<void> {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem('background_fetch_settings', JSON.stringify(newSettings));
    console.log('Background fetch settings updated:', newSettings);
  } catch (error) {
    console.error('Failed to set background fetch settings:', error);
  }
}

export async function registerBackgroundFetch(): Promise<void> {
  try {
    console.log('Registering background fetch...');
    
    // For Expo Go, background tasks are not supported
    if (__DEV__ && Platform.OS === 'ios') {
      console.log('Background fetch not supported in Expo Go for iOS');
      return;
    }

    const settings = await getSettings();
    
    await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: settings.interval * 1000, // Convert to milliseconds
    });
    
    console.log('Background fetch registered successfully');
  } catch (error) {
    console.error('Failed to register background fetch:', error);
    throw error;
  }
}

export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('Background fetch unregistered successfully');
  } catch (error) {
    console.error('Failed to unregister background fetch:', error);
    throw error;
  }
}

export async function getBackgroundFetchStatus(): Promise<{
  isRegistered: boolean;
  isAvailable: boolean;
  status?: string;
}> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    return {
      isRegistered,
      isAvailable: !__DEV__ || Platform.OS !== 'ios', // Available in production or on Android
      status: isRegistered ? 'registered' : 'not registered',
    };
  } catch (error) {
    console.error('Failed to get background fetch status:', error);
    return {
      isRegistered: false,
      isAvailable: false,
      status: 'error',
    };
  }
}
