/**
 * secureStorage.ts
 *
 * Wrapper de armazenamento seguro para dados sensíveis do usuário.
 *
 * - Dados sensíveis (perfil, contatos de emergência) → expo-secure-store (criptografado pelo SO)
 * - Dados volumosos (pets, vacinas, lembretes) → AsyncStorage (não cabem no SecureStore, limite ~2KB)
 *
 * expo-secure-store usa:
 *   Android → Android Keystore + EncryptedSharedPreferences
 *   iOS     → Keychain Services
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Chaves que contêm dados pessoais sensíveis → SecureStore
const SECURE_KEYS = new Set([
  'userProfile',              // nome, telefone, endereço, CEP, bio
  'petEmergencyContacts',     // contatos de emergência dos pets
]);

// No web, SecureStore não está disponível — fallback para AsyncStorage
const isSecureAvailable = Platform.OS !== 'web';

export async function secureSet(key: string, value: string): Promise<void> {
  if (isSecureAvailable && SECURE_KEYS.has(key)) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

export async function secureGet(key: string): Promise<string | null> {
  if (isSecureAvailable && SECURE_KEYS.has(key)) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

export async function secureRemove(key: string): Promise<void> {
  if (isSecureAvailable && SECURE_KEYS.has(key)) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

/**
 * migrateToSecureStore
 *
 * Migra uma vez dados já existentes no AsyncStorage para o SecureStore.
 * Chamado no boot do app (_layout.tsx). Idempotente — se já migrado, não faz nada.
 */
export async function migrateToSecureStore(): Promise<void> {
  if (!isSecureAvailable) return;

  for (const key of SECURE_KEYS) {
    try {
      // Se já existe no SecureStore, pula
      const existing = await SecureStore.getItemAsync(key);
      if (existing !== null) continue;

      // Migra do AsyncStorage
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) {
        await SecureStore.setItemAsync(key, legacy);
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Falha silenciosa — mantém no AsyncStorage como fallback
    }
  }
}
