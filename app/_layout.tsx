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
       message.includes('useNativeDriver'))
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
  }, []);

  // Notificação de reengajamento: agenda ao abrir o app
  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('../services/notificationService').then(NS => {
        NS.scheduleReengagementNotification(5);
      }).catch(() => {});
    }
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
