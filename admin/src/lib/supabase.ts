import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Shown instead of the app when admin/.env is missing the Supabase values. */
export const configError =
  !url || !key
    ? 'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set in admin/.env (copy admin/.env.example).'
    : null;

// The publishable key is safe in a browser: every admin read and action is checked by
// row level security and the owner check inside the admin_* database functions.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sol-admin-auth' },
});
