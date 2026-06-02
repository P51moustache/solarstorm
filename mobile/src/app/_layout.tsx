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
import { Palette } from '@/constants/solar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { hasOnboarded, setOnboarded } from '@/lib/onboarding';
import { configurePurchases } from '@/lib/purchases';
import { SkyProvider, useSky } from '@/lib/sky';

const SolarStormTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
    text: Palette.text,
    border: Palette.border,
    primary: Palette.accent,
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

  if (!loaded) return <View style={{ flex: 1, backgroundColor: Palette.bg }} />;

  return (
    <AuthProvider>
      <SkyProvider>
        <ExplainerProvider>
          <ThemeProvider value={SolarStormTheme}>
            <View style={{ flex: 1, backgroundColor: Palette.bg }}>
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
