import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Adapter que usa expo-secure-store no mobile para guardar a sessão
 * do Supabase (access token + refresh token) de forma criptografada.
 * No web usa localStorage (sem SSR) ou memória (SSR).
 *
 * SEGURANÇA: tokens de sessão ficam no Android Keystore / iOS Keychain
 * em vez do AsyncStorage (texto puro).
 */
const getStorage = () => {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage;
  }
  // SecureStore adapter compatível com a interface do Supabase
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Env vars missing — offline mode, auth features disabled.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
