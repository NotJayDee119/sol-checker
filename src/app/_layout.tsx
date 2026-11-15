import '../global.css';

import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineScreen, useOffline } from '@/components/offline-screen';
import { ToastProvider } from '@/components/toast';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    Caveat_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
  const network = useOffline();

  return (
    <SafeAreaProvider>
      <StoreProvider>
        {/* Outside AuthProvider so auth can announce things like "Profile photo updated". */}
        <ToastProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            {/* If fonts fail to load, carry on with system fonts rather than blocking the app. */}
            <RootNavigator ready={fontsLoaded || !!fontError} />
            {/* Overlay rather than a route, so the user lands back where they were once online. */}
            {network.offline ? <OfflineScreen checking={network.checking} onRetry={network.recheck} /> : null}
          </AuthProvider>
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator({ ready }: { ready: boolean }) {
  const { hydrated, teacher } = useStore();
  const auth = useAuth();

  // Also wait while a fresh sign-in pulls its profile, so the welcome screen doesn't flash.
  // Not during a password reset: that would unmount the reset screen mid-way.
  if (!hydrated || !ready || !auth.ready || (auth.syncing && !auth.recovering)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Without Supabase settings the app runs on-device only, with no sign-in (as before).
  // A correct reset code signs in early; keep the reset screen until the new password is saved.
  const signedIn = !auth.enabled || (!!auth.session && !auth.recovering);
  const hasProfile = !!teacher?.teacherName.trim();

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.info,
        headerTitleStyle: { color: colors.foreground, fontFamily: 'BricolageGrotesque_700Bold' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={signedIn && hasProfile}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Set up the item' }} />
        <Stack.Screen name="paper/[id]" options={{ title: 'Result' }} />
        <Stack.Screen name="folder/[name]" options={{ title: 'Folder' }} />
        <Stack.Screen
          name="help"
          options={{
            title: 'How to use SOL',
            headerLargeTitle: true,
            headerLargeTitleShadowVisible: false,
            headerTitleStyle: { color: colors.foreground },
            headerLargeTitleStyle: { color: colors.foreground },
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerLargeTitle: true,
            headerLargeTitleShadowVisible: false,
            // System font here, to match the Apple-style home and settings screens.
            headerTitleStyle: { color: colors.foreground },
            headerLargeTitleStyle: { color: colors.foreground },
          }}
        />
        <Stack.Screen
          name="change-password"
          options={{ title: 'Change Password', headerTitleStyle: { color: colors.foreground } }}
        />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !hasProfile}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
