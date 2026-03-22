import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ptBR from './locales/pt-BR';
import en from './locales/en';
import es from './locales/es';

export const SUPPORTED_LANGUAGES = ['pt-BR', 'en', 'es'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_STORAGE_KEY = 'appLanguage';

/** Mapeia tags BCP-47 do OS para os idiomas suportados */
function resolveLocale(tag: string): SupportedLanguage {
  if (tag.startsWith('pt')) return 'pt-BR';
  if (tag.startsWith('es')) return 'es';
  if (tag.startsWith('en')) return 'en';
  return 'pt-BR';
}

export async function getInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
      return stored as SupportedLanguage;
    }
  } catch { /* usa fallback */ }

  const tag = Localization.getLocales?.()?.[0]?.languageTag ?? 'pt-BR';
  return resolveLocale(tag);
}

export async function changeLanguage(lang: SupportedLanguage) {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export async function initI18n() {
  const lng = await getInitialLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        'pt-BR': { translation: ptBR },
        en:      { translation: en },
        es:      { translation: es },
      },
      lng,
      fallbackLng: 'pt-BR',
      interpolation: {
        escapeValue: false,
      },
      // pluralização: i18next usa _one/_other por padrão,
      // mas mapeamos manualmente com _plural para simplificar
      compatibilityJSON: 'v4',
    });

  return i18n;
}

export default i18n;
