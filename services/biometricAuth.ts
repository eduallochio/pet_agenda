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
/**
 * Solicita autenticação biométrica ao usuário.
 * Retorna true se autenticado.
 * Retorna false se cancelou, falhou ou biometria não está configurada.
 *
 * SEGURANÇA: Se o dispositivo não tiver biometria cadastrada,
 * não libera automaticamente — retorna false para forçar confirmação
 * explícita no nível da UI (ex: Alert de confirmação).
 */
export async function requestBiometricAuth(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Usar senha do dispositivo',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });

  return result.success;
}

/**
 * Verifica se biometria está disponível e cadastrada no dispositivo.
 * Usado para decidir se exibe ou não o fluxo biométrico.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}
