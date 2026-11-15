import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client, or null when the project .env has no Supabase settings. Then the app
 * skips sign-in and keeps working on-device only, as before.
 *
 * Sessions are kept in AsyncStorage (already used by the app's store, and works on
 * Android, iOS and web). The publishable key is safe to ship: row level security in
 * backend/supabase/migrations decides what each teacher can read and write.
 */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // Phones have no URL to read a session from.
          detectSessionInUrl: false,
        },
      })
    : null;

// On phones the token refresh loop would run forever; only run it while the app is open.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
