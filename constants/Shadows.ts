// Sistema de sombras consistente para o app
// Funciona tanto em iOS/Android quanto na Web

import { Platform } from 'react-native';

// Helper para criar sombras compatíveis com todas as plataformas
const createShadow = (
  elevation: number,
  shadowColor: string = '#000',
  shadowOpacity: number = 0.15
) => {
  if (Platform.OS === 'web') {
    // Para web, usar boxShadow (CSS)
    return {
      boxShadow: `0px ${elevation}px ${elevation * 2}px rgba(0, 0, 0, ${shadowOpacity})`,
    };
  }
  
  // Para iOS/Android, usar shadow* props
  return {
    shadowColor,
    shadowOffset: { width: 0, height: elevation / 2 },
    shadowOpacity,
    shadowRadius: elevation,
    elevation,
  };
};

export const Shadows = {
  // Sombra pequena - Para elementos sutis
  small: createShadow(2, '#000', 0.1),

  // Sombra média - Para cards principais
  medium: createShadow(4, '#000', 0.15),

  // Sombra grande - Para elementos destacados
  large: createShadow(8, '#000', 0.2),

  // Sombra extra grande - Para modals e overlays
  extraLarge: createShadow(12, '#000', 0.25),

  // Sombra colorida - Para botões principais
  primary: {
    ...createShadow(6, '#40E0D0', 0.3),
  },
};
