import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// No web (SSR/browser), AsyncStorage não existe — usa localStorage.
// No mobile (iOS/Android), usa AsyncStorage para persistir sessão.
const getStorage = () => {
  if (Platform.OS === 'web') {
    // Durante SSR o localStorage também não existe — retorna undefined
    // e o Supabase usará memória (sem persistência, ok para web).
    if (typeof window === 'undefined') return undefined;
    return window.localStorage;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
