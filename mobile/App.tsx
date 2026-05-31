import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './src/state/useAuth';
import { theme } from './src/lib/theme';
import type { RootStackParamList } from './src/navigation/types';
import { SignInScreen } from './src/screens/SignInScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { RulesScreen } from './src/screens/RulesScreen';
import { RuleEditScreen } from './src/screens/RuleEditScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

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

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.emerald} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      {session ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Rules" component={RulesScreen} options={{ title: 'My alerts' }} />
          <Stack.Screen name="RuleEdit" component={RuleEditScreen} options={{ title: 'Alert' }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={SignInScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
