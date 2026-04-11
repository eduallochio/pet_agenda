import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useEffect, useState, Component, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

// Captura global de erros JS não tratados
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 24, paddingTop: 60, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#c00', marginBottom: 12 }}>
            Erro crítico detectado
          </Text>
          <ScrollView>
            <Text style={{ fontSize: 13, color: '#333', fontFamily: 'monospace' }}>
              {this.state.error.message}{'\n\n'}{this.state.error.stack}
            </Text>
          </ScrollView>
          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: 12, backgroundColor: '#40E0D0', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider } from '../contexts/ThemeContext';
import { initI18n } from '../i18n';
import { migrateToSecureStore } from '../services/secureStorage';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';
import { requestAdsConsent } from '../services/adsConsentService';

// Suprimir warnings conhecidos do React Native Web em desenvolvimento
if (__DEV__ && Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('shadow') ||
       message.includes('pointerEvents is deprecated') ||
       message.includes('useNativeDriver'))
    ) {
      return;
    }
    originalWarn(...args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('shadow') ||
       message.includes('useNativeDriver') ||
       message.includes('Unexpected text node') ||
       message.includes('aria-hidden'))
    ) {
      return;
    }
    originalError(...args);
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [i18nInstance, setI18nInstance] = useState<any>(null);

  useEffect(() => {
    initI18n().then(setI18nInstance);
    migrateToSecureStore().catch(() => {});
    if (Platform.OS !== 'web') {
      requestAdsConsent();
    }
  }, []);

  // Captura deep link OAuth (zupet://auth/callback#access_token=...)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes('auth/callback')) return;
      try {
        const parsed = new URL(url);
        const hash = Object.fromEntries(new URLSearchParams(parsed.hash.slice(1)));
        const query = Object.fromEntries(parsed.searchParams);
        const access_token = hash.access_token ?? query.access_token;
        const refresh_token = hash.refresh_token ?? query.refresh_token;
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      } catch {}
    };

    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Notificação de reengajamento: agenda ao abrir o app
  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('../services/notificationService').then(NS => {
        NS.scheduleReengagementNotification(5);
      }).catch(() => {});
    }
  }, []);

  // Salvar notificações recebidas no histórico
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let receivedSub: any;
    let responseSub: any;
    import('expo-notifications').then(Notifications => {
      import('../services/notificationHistory').then(({ addToHistory }) => {
        receivedSub = Notifications.addNotificationReceivedListener(notification => {
          const { title, body, data } = notification.request.content;
          if (!title) return;
          addToHistory({
            type: (data?.type as any) ?? 'reminder',
            title: title ?? '',
            body: body ?? '',
            petId: data?.petId as string | undefined,
            reminderId: data?.reminderId as string | undefined,
            vaccineId: data?.vaccineId as string | undefined,
          }).catch(() => {});
        });
        responseSub = Notifications.addNotificationResponseReceivedListener(response => {
          const { title, body, data } = response.notification.request.content;
          if (!title) return;
          addToHistory({
            type: (data?.type as any) ?? 'reminder',
            title: title ?? '',
            body: body ?? '',
            petId: data?.petId as string | undefined,
            reminderId: data?.reminderId as string | undefined,
            vaccineId: data?.vaccineId as string | undefined,
          }).catch(() => {});
        });
      });
    });
    return () => {
      receivedSub?.remove?.();
      responseSub?.remove?.();
    };
  }, []);

  // Sync de download ao abrir o app — só executa se houver sessão ativa
  useEffect(() => {
    import('../services/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        import('../services/syncService').then(({ downloadFromSupabase }) => {
          downloadFromSupabase().catch(() => {});
        });
      });
    });
  }, []);

  if (!loaded || !i18nInstance) {
    return null;
  }

  return (
    <ErrorBoundary>
    <I18nextProvider i18n={i18nInstance}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="pet/[id]" />
              <Stack.Screen name="pet/edit" />
              <Stack.Screen name="vaccines/[petId]" />
              <Stack.Screen name="vaccines/new" />
              <Stack.Screen name="reminder/new" />
              <Stack.Screen name="profile/edit" />
              <Stack.Screen name="friends/add" />
              <Stack.Screen name="calendar" />
              <Stack.Screen name="monthly-report" />
              <Stack.Screen name="breed-info" />
              <Stack.Screen name="pet/weight" />
              <Stack.Screen name="pet/diary" />
              <Stack.Screen name="pet/documents" />
              <Stack.Screen name="pet/medications" />
              <Stack.Screen name="pet/passport" />
              <Stack.Screen name="pet/photos" />
              <Stack.Screen name="pet/feeding" />
              <Stack.Screen name="pet/emergency-contacts" />
              <Stack.Screen name="nearby" />
              <Stack.Screen name="conquistas" />
              <Stack.Screen name="+not-found" options={{ headerShown: true }} />
            </Stack>
            <StatusBar style="auto" />
          </BottomSheetModalProvider>
        </NavigationThemeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
    </I18nextProvider>
    </ErrorBoundary>
  );
}
