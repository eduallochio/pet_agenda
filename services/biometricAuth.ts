/**
 * biometricAuth.ts
 *
 * Utilitário para autenticação biométrica opcional em ações sensíveis.
 * Usa expo-local-authentication (Android Biometric / iOS Face ID / Touch ID).
 *
 * - Se o dispositivo não suportar biometria, libera a ação diretamente.
 * - Se o usuário cancelar, bloqueia a ação.
 * - No web, sempre libera (não disponível).
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * Solicita autenticação biométrica ao usuário.
 * Retorna true se autenticado (ou se biometria não disponível).
 * Retorna false se o usuário cancelou ou falhou.
 */
export async function requestBiometricAuth(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return true;

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return true;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Usar senha',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });

  return result.success;
}
