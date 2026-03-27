import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../constants/Colors';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        Alert.alert('✅ Bem-vindo!', 'Login realizado com sucesso.');
        router.back();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert(
          '✅ Conta criada!',
          'Verifique seu e-mail para confirmar a conta antes de fazer login.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
      }
    } catch (e: any) {
      const msg = e.message?.includes('Invalid login credentials')
        ? 'E-mail ou senha incorretos.'
        : e.message?.includes('User already registered')
        ? 'Este e-mail já está cadastrado.'
        : e.message || 'Erro inesperado.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Ícone */}
          <View style={[styles.iconCircle, { backgroundColor: Theme.primary + '18' }]}>
            <Ionicons name="cloud-outline" size={40} color={Theme.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>
            {mode === 'login' ? 'Acesse seus backups' : 'Crie sua conta de backup'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {mode === 'login'
              ? 'Faça login para sincronizar seus dados entre dispositivos.'
              : 'Seus dados ficam seguros na nuvem e podem ser restaurados a qualquer momento.'}
          </Text>

          {/* E-mail */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
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
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.text.secondary} />
            <TextInput
              style={[styles.input, { color: colors.text.primary }]}
              placeholder="Senha (mínimo 6 caracteres)"
              placeholderTextColor={colors.text.secondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* Botão principal */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Theme.primary }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                </Text>
            }
          </TouchableOpacity>

          {/* Alternar modo */}
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setMode(m => m === 'login' ? 'signup' : 'login')}
          >
            <Text style={[styles.toggleText, { color: colors.text.secondary }]}>
              {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
              <Text style={{ color: Theme.primary, fontWeight: '700' }}>
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 32, paddingHorizontal: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 12, gap: 10,
  },
  input: { flex: 1, fontSize: 15 },
  button: {
    width: '100%', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  toggleBtn: { marginTop: 20 },
  toggleText: { fontSize: 14 },
});
