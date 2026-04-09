import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../../services/supabase';
import { useTheme, useIsDarkMode } from '../../hooks/useTheme';
import { Theme } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';

WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get('window');

type Mode = 'login' | 'signup' | 'forgot';

export default function LoginScreen() {
  const { colors } = useTheme();
  const isDark = useIsDarkMode();
  const router = useRouter();
  const { t } = useTranslation();

  const { mode: initialMode } = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(initialMode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  const isBlocked = blockedUntil !== null && Date.now() < blockedUntil;
  const blockSecondsLeft = isBlocked ? Math.ceil((blockedUntil! - Date.now()) / 1000) : 0;

  const resetFields = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetFields();
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      const appCallback = Linking.createURL('auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: appCallback, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('No URL');

      // Escuta mudança de sessão ANTES de abrir o browser
      // Assim captura o login independente de como o browser retorna
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          subscription.unsubscribe();
          router.back();
        }
      });

      const result = await WebBrowser.openAuthSessionAsync(data.url, appCallback);

      // Se o browser retornou URL com tokens, processa manualmente
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const hash = Object.fromEntries(new URLSearchParams(url.hash.slice(1)));
        const query = Object.fromEntries(url.searchParams);
        const access_token = hash.access_token ?? query.access_token;
        const refresh_token = hash.refresh_token ?? query.refresh_token;

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          // onAuthStateChange vai disparar e navegar
          return;
        }
      }

      // Se browser fechou sem sucesso e sessão não foi criada, limpa listener
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        subscription.unsubscribe();
        if (result.type !== 'cancel' && result.type !== 'dismiss') {
          Alert.alert(t('common.error'), t('auth.errorGeneric'));
        }
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('auth.errorGeneric'));
    }
  };

  const handleSubmit = async () => {
    if (isBlocked) {
      Alert.alert(t('auth.blockedTitle'), t('auth.blockedMsg', { seconds: blockSecondsLeft }));
      return;
    }
    if (!email.trim()) {
      Alert.alert(t('common.attention'), t('auth.errorEmailRequired'));
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        Alert.alert(
          t('auth.emailSentTitle'),
          t('auth.emailSentMsg'),
          [{ text: 'OK', onPress: () => switchMode('login') }]
        );
      } catch (e: any) {
        Alert.alert(t('common.error'), e.message || t('auth.errorGeneric'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      Alert.alert(t('common.attention'), t('auth.errorPasswordRequired'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.attention'), t('auth.errorPasswordLength'));
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      Alert.alert(t('common.attention'), t('auth.errorPasswordMatch'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.back();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        Alert.alert(
          t('auth.accountCreatedTitle'),
          t('auth.accountCreatedMsg'),
          [{ text: 'OK', onPress: () => switchMode('login') }]
        );
      }
    } catch (e: any) {
      const msg =
        e.message?.includes('Invalid login credentials') ? t('auth.errorInvalidCredentials') :
        e.message?.includes('User already registered')   ? t('auth.errorAlreadyRegistered') :
        e.message?.includes('Email not confirmed')       ? t('auth.errorEmailNotConfirmed') :
        e.message || t('auth.errorGeneric');
      if (mode === 'login') {
        const next = failCount + 1;
        setFailCount(next);
        if (next >= 3) {
          setBlockedUntil(Date.now() + 30_000);
          setFailCount(0);
          Alert.alert(t('auth.blockedTitle'), t('auth.blockedMsgFull') + '\n\n' + msg);
        } else {
          Alert.alert(t('common.error'), `${msg} ${t('auth.errorAttempt', { count: next })}`);
        }
      } else {
        Alert.alert(t('common.error'), msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, string> = {
    login:  t('auth.loginTitle'),
    signup: t('auth.signupTitle'),
    forgot: t('auth.forgotTitle'),
  };
  const subtitles: Record<Mode, string> = {
    login:  t('auth.loginSubtitle'),
    signup: t('auth.signupSubtitle'),
    forgot: t('auth.forgotSubtitle'),
  };
  const btnLabels: Record<Mode, string> = {
    login:  t('auth.loginBtn'),
    signup: t('auth.signupBtn'),
    forgot: t('auth.sendLinkBtn'),
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Fundo gradiente */}
      <LinearGradient
        colors={isDark ? ['#0f0f1a', '#1a1a2e'] : ['#667eea', '#764ba2']}
        style={StyleSheet.absoluteFill}
      />

      {/* Patas decorativas no fundo */}
      <View style={styles.bgPaws} pointerEvents="none">
        <Text style={styles.bgPaw}>🐾</Text>
        <Text style={[styles.bgPaw, { top: '25%', right: '-5%', fontSize: 80, opacity: 0.05 }]}>🐾</Text>
        <Text style={[styles.bgPaw, { bottom: '20%', left: '10%', fontSize: 50, opacity: 0.06 }]}>🐾</Text>
      </View>

      {/* Botão voltar */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="paw" size={36} color="#fff" />
            </View>
            <Text style={styles.appName}>Zupet</Text>
            <Text style={styles.appTagline}>{t('auth.appTagline')}</Text>
          </View>

          {/* Card principal */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>

            {/* Tabs login / cadastro */}
            {mode !== 'forgot' && (
              <View style={[styles.tabs, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'login' && { backgroundColor: colors.surface }]}
                  onPress={() => switchMode('login')}
                >
                  <Text style={[styles.tabText, { color: mode === 'login' ? Theme.primary : colors.text.secondary }]}>
                    {t('auth.loginTab')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === 'signup' && { backgroundColor: colors.surface }]}
                  onPress={() => switchMode('signup')}
                >
                  <Text style={[styles.tabText, { color: mode === 'signup' ? Theme.primary : colors.text.secondary }]}>
                    {t('auth.signupTab')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.title, { color: colors.text.primary }]}>{titles[mode]}</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{subtitles[mode]}</Text>

            {/* E-mail */}
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="mail-outline" size={18} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.text.secondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Senha */}
            {mode !== 'forgot' && (
              <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.text.secondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Confirmar senha (apenas cadastro) */}
            {mode === 'signup' && (
              <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  placeholderTextColor={colors.text.secondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Esqueci a senha */}
            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotBtn} onPress={() => switchMode('forgot')}>
                <Text style={[styles.forgotText, { color: Theme.primary }]}>{t('auth.forgotLink')}</Text>
              </TouchableOpacity>
            )}

            {/* Aviso de bloqueio */}
            {isBlocked && (
              <View style={styles.blockedBanner}>
                <Ionicons name="time-outline" size={14} color="#c0392b" />
                <Text style={styles.blockedText}>{t('auth.blockedBanner', { seconds: blockSecondsLeft })}</Text>
              </View>
            )}

            {/* Botão principal */}
            <TouchableOpacity
              style={[styles.submitBtn, (loading || isBlocked) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={loading || isBlocked}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>{btnLabels[mode]}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Voltar do forgot */}
            {mode === 'forgot' && (
              <TouchableOpacity style={styles.switchBtn} onPress={() => switchMode('login')}>
                <Ionicons name="arrow-back-outline" size={14} color={colors.text.secondary} />
                <Text style={[styles.switchText, { color: colors.text.secondary }]}> {t('auth.backToLogin')}</Text>
              </TouchableOpacity>
            )}

            {/* Social login */}
            {mode !== 'forgot' && (
              <>
                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.text.secondary }]}>{t('auth.orContinueWith')}</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => handleOAuthLogin('google')}
                >
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={[styles.socialBtnText, { color: colors.text.primary }]}>{t('auth.continueWithGoogle')}</Text>
                </TouchableOpacity>

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => handleOAuthLogin('apple')}
                  >
                    <Ionicons name="logo-apple" size={20} color={colors.text.primary} />
                    <Text style={[styles.socialBtnText, { color: colors.text.primary }]}>{t('auth.continueWithApple')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Info privacidade */}
            <Text style={[styles.privacyText, { color: colors.text.secondary }]}>
              {t('auth.privacyText')}{' '}
              <Text style={{ color: Theme.primary }}>{t('auth.termsLink')}</Text>
              {' '}{t('auth.privacyAnd')}{' '}
              <Text style={{ color: Theme.primary }}>{t('auth.privacyLink')}</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgPaws: { ...StyleSheet.absoluteFillObject },
  bgPaw: { position: 'absolute', top: '8%', left: '-5%', fontSize: 120, opacity: 0.06 },
  backBtn: {
    position: 'absolute', top: 52, left: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 32 },
  header: { alignItems: 'center', paddingTop: height * 0.12, paddingBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  appTagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card: {
    marginHorizontal: 16, borderRadius: 24,
    padding: 24, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  tabs: {
    flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 24 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, marginBottom: 12, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 2 },
  forgotText: { fontSize: 13, fontWeight: '600' },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  submitGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  switchText: { fontSize: 13 },
  privacyText: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 16 },
  blockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FDEDEC', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  blockedText: { fontSize: 13, color: '#c0392b', flex: 1 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 13, marginBottom: 10,
  },
  socialBtnText: { fontSize: 15, fontWeight: '600' },
});
