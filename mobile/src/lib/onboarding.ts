import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'solarstorm.onboarded.v1';

export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // best-effort
  }
}
