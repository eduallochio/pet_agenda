import { Platform } from 'react-native';
import { Shadows } from './Shadows';

/**
 * Retorna estilos de shadow compatíveis com web e mobile
 * @param shadowType Tipo do shadow (small, medium, primary)
 * @param webShadow Shadow customizado para web (opcional)
 * @returns Objeto de estilo compatível com ambas plataformas
 */
export const createWebShadow = (
  shadowType: 'small' | 'medium' | 'primary',
  webShadow?: string
) => {
  const webShadows = {
    small: '0 2px 4px rgba(0,0,0,0.1)',
    medium: '0 4px 8px rgba(0,0,0,0.15)',
    primary: '0 6px 12px rgba(77,120,255,0.4)',
  };

  if (Platform.OS === 'web') {
    return { boxShadow: webShadow || webShadows[shadowType] };
  }
  
  return Shadows[shadowType];
};

/**
 * Hook para obter shadows compatíveis com web
 */
export const useWebShadows = () => {
  return {
    small: createWebShadow('small'),
    medium: createWebShadow('medium'),
    primary: createWebShadow('primary'),
  };
};