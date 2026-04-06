import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useTheme, useIsDarkMode } from '../../hooks/useTheme';
import { Theme } from '../../constants/Colors';

const { height } = Dimensions.get('window');

type Mode = 'login' | 'signup' | 'forgot';

export default function LoginScreen() {
  const { colors } = useTheme();
  const isDark = useIsDarkMode();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        Alert.alert(
          '📧 E-mail enviado!',
          'Verifique sua caixa de entrada para redefinir a senha.',
          [{ text: 'OK', onPress: () => switchMode('login') }]
        );
      } catch (e: any) {
        Alert.alert('Erro', e.message || 'Não foi possível enviar o e-mail.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      Alert.alert('Atenção', 'Informe sua senha.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
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
          '✅ Conta criada!',
          'Verifique seu e-mail para confirmar a conta antes de fazer login.',
          [{ text: 'OK', onPress: () => switchMode('login') }]
        );
      }
    } catch (e: any) {
      const msg =
        e.message?.includes('Invalid login credentials') ? 'E-mail ou senha incorretos.' :
        e.message?.includes('User already registered')   ? 'Este e-mail já está cadastrado.' :
        e.message?.includes('Email not confirmed')       ? 'Confirme seu e-mail antes de entrar.' :
        e.message || 'Erro inesperado. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, string> = {
    login:  'Bem-vindo de volta',
    signup: 'Criar conta',
    forgot: 'Redefinir senha',
  };
  const subtitles: Record<Mode, string> = {
    login:  'Acesse seus dados sincronizados entre dispositivos.',
    signup: 'Crie sua conta gratuita e mantenha os dados dos seus pets seguros na nuvem.',
    forgot: 'Informe seu e-mail e enviaremos um link para redefinir sua senha.',
  };
  const btnLabels: Record<Mode, string> = {
    login:  'Entrar',
    signup: 'Criar conta',
    forgot: 'Enviar link',
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
            <Text style={styles.appName}>Pet Agenda</Text>
            <Text style={styles.appTagline}>Cuide bem de quem você ama</Text>
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
                    Entrar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === 'signup' && { backgroundColor: colors.surface }]}
                  onPress={() => switchMode('signup')}
                >
                  <Text style={[styles.tabText, { color: mode === 'signup' ? Theme.primary : colors.text.secondary }]}>
                    Criar conta
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.title, { color: colors.text.primary }]}>{titles[mode]}</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{subtitles[mode]}</Text>

            {/* Banner: cadastro em implementação */}
            {mode === 'signup' && (
              <View style={styles.wipBanner}>
                <Ionicons name="construct-outline" size={16} color="#FF9800" />
                <Text style={styles.wipText}>
                  Esta funcionalidade está sendo implementada e em breve estará disponível.
                </Text>
              </View>
            )}

            {/* E-mail */}
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="mail-outline" size={18} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="E-mail"
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
                  placeholder="Senha"
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
                  placeholder="Confirmar senha"
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
                <Text style={[styles.forgotText, { color: Theme.primary }]}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            )}

            {/* Botão principal */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
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
                <Text style={[styles.switchText, { color: colors.text.secondary }]}> Voltar para o login</Text>
              </TouchableOpacity>
            )}

            {/* Divisor social (placeholder) */}
            {mode !== 'forgot' && (
              <>
                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.text.secondary }]}>ou continue com</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Botões sociais — em breve */}
                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => Alert.alert('Em breve', 'Login com Google será disponibilizado em breve.')}
                  >
                    <Text style={styles.socialIcon}>G</Text>
                    <Text style={[styles.socialLabel, { color: colors.text.primary }]}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => Alert.alert('Em breve', 'Login com Apple será disponibilizado em breve.')}
                  >
                    <Ionicons name="logo-apple" size={18} color={colors.text.primary} />
                    <Text style={[styles.socialLabel, { color: colors.text.primary }]}>Apple</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Info privacidade */}
            <Text style={[styles.privacyText, { color: colors.text.secondary }]}>
              Ao continuar, você concorda com nossos{' '}
              <Text style={{ color: Theme.primary }}>Termos de Uso</Text>
              {' '}e{' '}
              <Text style={{ color: Theme.primary }}>Política de Privacidade</Text>.
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '500' },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12,
  },
  socialIcon: { fontSize: 16, fontWeight: '800', color: '#EA4335' },
  socialLabel: { fontSize: 14, fontWeight: '600' },
  privacyText: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 16 },
  wipBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  wipText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
});
