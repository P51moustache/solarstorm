import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuroraBackground } from '@/components/AuroraBackground';
import { ExplainerProvider } from '@/components/explainer';
import { Onboarding } from '@/components/Onboarding';
import { getAlertPrefs } from '@/lib/alertPrefs';
import { AuthProvider, useAuth } from '@/lib/auth';
import { registerAlertTask } from '@/lib/backgroundAlerts';
import { hasOnboarded, setOnboarded } from '@/lib/onboarding';
import { configurePurchases } from '@/lib/purchases';
import { SkyProvider, useSky } from '@/lib/sky';
import { colors } from '@/theme';

const SolarStormTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function Backdrop() {
  const { mood } = useSky();
  return <AuroraBackground intensity={mood.intensity} colors={mood.colors} />;
}

function RootNavigator() {
  const { user } = useAuth();
  const [onboarded, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    configurePurchases(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    hasOnboarded().then(setDone);
    // Re-arm the background alert check if the user has enabled notifications.
    getAlertPrefs().then((p) => {
      if (p.notificationsEnabled) registerAlertTask();
    });
  }, []);

  if (onboarded === null) return null; // brief gate while we read the flag
  if (!onboarded) {
    return (
      <Onboarding
        onDone={() => {
          setOnboarded();
          setDone(true);
        }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="learn" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <AuthProvider>
      <SkyProvider>
        <ExplainerProvider>
          <ThemeProvider value={SolarStormTheme}>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <Backdrop />
              <StatusBar style="light" />
              <RootNavigator />
            </View>
          </ThemeProvider>
        </ExplainerProvider>
      </SkyProvider>
    </AuthProvider>
  );
}
