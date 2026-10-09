// De verbinding met Supabase (inloggen en database).
// Het adres en de publieke sleutel komen uit het bestand .env.local;
// zie de README in de hoofdmap.

import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { sessionStorage } from './session-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

/** Is de app al aan een Supabase-project gekoppeld? */
export const isConfigured = url.startsWith('https://') && key.length > 20;

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url, key, {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// De sessie alleen verversen zolang de app op de voorgrond staat.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
