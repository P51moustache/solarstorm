import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { useAuth } from './src/state/useAuth';
import { theme } from './src/lib/theme';
import { configureNotificationHandler, registerForPushNotifications } from './src/lib/push';
import { configurePurchases, deidentifyUser, identifyUser } from './src/lib/purchases';
import { navigationRef } from './src/navigation/ref';
import type { RootStackParamList } from './src/navigation/types';
import { SignInScreen } from './src/screens/SignInScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { RulesScreen } from './src/screens/RulesScreen';
import { RuleEditScreen } from './src/screens/RuleEditScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// One-time setup at module load.
configureNotificationHandler();
configurePurchases();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.bg,
    card: theme.bg,
    text: theme.text,
    border: theme.border,
    primary: theme.emerald,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: theme.bg },
  headerTintColor: theme.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.bg },
} as const;

export default function App() {
  const { session, initializing, initialize } = useAuth();
  const userId = session?.user.id;
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Register this device for push and tie RevenueCat to the user once signed in.
  useEffect(() => {
    if (userId && registeredFor.current !== userId) {
      registeredFor.current = userId;
      registerForPushNotifications(userId);
      identifyUser(userId);
    }
    if (!userId && registeredFor.current !== null) {
      registeredFor.current = null;
      deidentifyUser();
    }
  }, [userId]);

  // Tapping a notification opens the alerts screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Rules');
      }
    });
    return () => sub.remove();
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.emerald} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style="light" />
      {session ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Rules" component={RulesScreen} options={{ title: 'My alerts' }} />
          <Stack.Screen name="RuleEdit" component={RuleEditScreen} options={{ title: 'Alert' }} />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ title: 'Premium', presentation: 'modal' }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={SignInScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
