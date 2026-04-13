import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, BackHandler, Platform, ToastAndroid } from 'react-native';
import {
  AndroidSoftInputModes,
  KeyboardController,
  KeyboardProvider,
} from 'react-native-keyboard-controller';

import { UI } from '@/constants/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { firebaseService, usingMockFirebase, isExpoGo } from '@/services/firebaseServiceSelector';
import { checkAccountStatus, getUser, isAuthenticated } from '@/utils/auth';
import type { AppRoute } from '@/types/routes';

console.log('Firebase debug appOwnership:', isExpoGo ? 'expo' : 'non-expo');
console.log('Firebase debug mode:', usingMockFirebase ? 'mock' : 'real');

export const unstable_settings = {
  initialRouteName: 'login',
};

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const [initializing, setInitializing] = useState(true);
  const [pendingRoute, setPendingRoute] = useState<AppRoute | null>(null);
  const pathname = usePathname();
  const segments = useSegments();
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_RESIZE);
    return () => {
      KeyboardController.setDefaultMode();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        await firebaseService.initialize();

        const authed = await isAuthenticated();
        if (authed) {
          const isActive = await checkAccountStatus();
          if (!isActive && isMounted) {
            setPendingRoute('/login');
            return;
          }

          if (isMounted) {
            const user = await getUser();
            const needsPasswordChange = !Boolean(user?.password_changed);
            setPendingRoute(needsPasswordChange ? '/(auth)/force-change-password' : '/(tabs)');
          }
        } else if (isMounted) {
          setPendingRoute('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
      firebaseService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!initializing && pendingRoute) {
      router.replace(pendingRoute);
      setPendingRoute(null);
    }
  }, [initializing, pendingRoute]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      const inTabsRoot = segments[0] === '(tabs)' && segments.length === 1;
      const inAuthRoot =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/force-change-password' ||
        pathname === '/change-password';

      if (inTabsRoot || inAuthRoot) {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
        } else {
          lastBackPressRef.current = now;
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [pathname, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <Stack initialRouteName="login">
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/change-password" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/force-change-password" options={{ headerShown: false }} />
          <Stack.Screen name="trip-details/index" options={{ headerShown: false }} />
          <Stack.Screen name="request-new" options={{ headerShown: false }} />
          <Stack.Screen name="request-details/index" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="proof" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        {initializing && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: UI.colors.background,
            }}
          >
            <ActivityIndicator size="large" color={UI.colors.green} />
          </View>
        )}
      </View>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <KeyboardProvider preload={false}>
      <RootLayoutInner />
    </KeyboardProvider>
  );
}
