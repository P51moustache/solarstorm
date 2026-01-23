import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuthStore } from '@/lib/state/useAuthStore';
import { registerBackgroundFetch } from '@/lib/util/background';
import { configureNotifications } from '@/lib/util/notifications';

const SolarStormTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#00D084',
    background: '#0B1020',
    card: '#111833',
    text: '#E6ECFF',
    border: '#1E2347',
    notification: '#00D084',
  },
};

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
    // Configure notifications and background tasks
    configureNotifications();
    registerBackgroundFetch();
  }, [initialize]);

  return (
    <ThemeProvider value={SolarStormTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="pricing" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen
          name="modal-map"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Aurora Map',
            headerStyle: { backgroundColor: '#0B1020' },
            headerTintColor: '#E6ECFF',
          }}
        />
        <Stack.Screen
          name="modal-settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Settings',
            headerStyle: { backgroundColor: '#0B1020' },
            headerTintColor: '#E6ECFF',
          }}
        />
        <Stack.Screen
          name="globe"
          options={{
            headerShown: true,
            headerTitle: 'Aurora Globe',
            headerStyle: { backgroundColor: '#0B1020' },
            headerTintColor: '#E6ECFF',
          }}
        />
      </Stack>
      <StatusBar style="light" backgroundColor="#0B1020" />
    </ThemeProvider>
  );
}
