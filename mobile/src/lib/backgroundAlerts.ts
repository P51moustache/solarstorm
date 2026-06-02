import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { runAlertChecks } from '@/lib/spaceWeatherAlerts';

export const ALERT_TASK = 'solarstorm-alert-check';

// Must be defined in global scope (module import), not inside a component.
TaskManager.defineTask(ALERT_TASK, async () => {
  try {
    await runAlertChecks();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Register the periodic background check (iOS runs it opportunistically, ≥15 min). */
export async function registerAlertTask(): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(ALERT_TASK);
    if (!registered) {
      await BackgroundTask.registerTaskAsync(ALERT_TASK, { minimumInterval: 30 });
    }
  } catch {
    // No-op in Expo Go / simulator where background tasks are unavailable.
  }
}

export async function unregisterAlertTask(): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(ALERT_TASK);
    if (registered) await BackgroundTask.unregisterTaskAsync(ALERT_TASK);
  } catch {
    // ignore
  }
}
