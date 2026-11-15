import { Image } from 'expo-image';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

const NO_INTERNET = require('../../assets/no-internet.gif');

/** Unknown (undefined) counts as online, so the screen never flashes while the first check runs. */
function isOffline(state: NetworkState | null) {
  return state?.isConnected === false || state?.isInternetReachable === false;
}

/** Live network status, plus a manual re-check for the "Try again" button. */
export function useOffline() {
  const [state, setState] = useState<NetworkState | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    getNetworkStateAsync()
      .then((s) => active && setState(s))
      .catch(() => {});
    const sub = addNetworkStateListener((s) => setState(s));
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      setState(await getNetworkStateAsync());
    } catch {
      // Keep the last known state.
    } finally {
      setChecking(false);
    }
  }, []);

  return { offline: isOffline(state), checking, recheck };
}

/** Full-screen notice shown over the app while the device has no internet connection. */
export function OfflineScreen({ checking, onRetry }: { checking: boolean; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute inset-0 items-center justify-center bg-card px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
    >
      <View className="w-full max-w-sm items-center gap-3">
        <Image
          source={NO_INTERNET}
          style={{ width: 220, height: 220 }}
          contentFit="contain"
          autoplay
          accessible={false}
        />
        <Text variant="title2" className="text-center" role="heading">
          No internet connection
        </Text>
        <Text variant="body" tone="muted" className="text-center">
          SOL needs the internet to check papers and save your work. Turn on Wi-Fi or mobile data, then try again.
        </Text>
        <Button className="mt-4 w-full" loading={checking} onPress={onRetry}>
          <Text>Try again</Text>
        </Button>
      </View>
    </View>
  );
}
