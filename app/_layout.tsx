import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
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

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Configure notifications and background tasks
    configureNotifications();
    registerBackgroundFetch();
  }, []);

  return (
    <ThemeProvider value={SolarStormTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen 
          name="modal-map" 
          options={{ 
            presentation: 'modal',
            headerTitle: 'Aurora Map',
            headerStyle: { backgroundColor: '#0B1020' },
            headerTintColor: '#E6ECFF',
          }} 
        />
        <Stack.Screen 
          name="modal-settings" 
          options={{ 
            presentation: 'modal',
            headerTitle: 'Settings',
            headerStyle: { backgroundColor: '#0B1020' },
            headerTintColor: '#E6ECFF',
          }} 
        />
      </Stack>
      <StatusBar style="light" backgroundColor="#0B1020" />
    </ThemeProvider>
  );
}
