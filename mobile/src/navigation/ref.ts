import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Lets non-React code (e.g. a push-notification tap handler) drive navigation.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
