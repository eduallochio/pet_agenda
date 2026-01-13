/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// ====== TEMA PET AGENDA ======

export const Theme = {
  // Cores principais
  primary: '#40E0D0',        // Turquesa - Cor principal do app
  primaryDark: '#2CB5A8',    // Turquesa escuro
  primaryLight: '#7FFFD4',   // Turquesa claro
  
  // Cores por categoria de lembretes
  categories: {
    Saúde: {
      main: '#4CAF50',       // Verde
      light: '#E8F5E9',      // Verde claro para background
      dark: '#388E3C',       // Verde escuro
    },
    Higiene: {
      main: '#2196F3',       // Azul
      light: '#E3F2FD',      // Azul claro
      dark: '#1976D2',       // Azul escuro
    },
    Consulta: {
      main: '#FF9800',       // Laranja
      light: '#FFF3E0',      // Laranja claro
      dark: '#F57C00',       // Laranja escuro
    },
    Outro: {
      main: '#9E9E9E',       // Cinza
      light: '#F5F5F5',      // Cinza claro
      dark: '#616161',       // Cinza escuro
    },
  },

  // Cores de status
  success: '#4CAF50',        // Verde para sucesso
  warning: '#FF9800',        // Laranja para avisos
  danger: '#F44336',         // Vermelho para erros/urgência
  info: '#2196F3',           // Azul para informação
  
  // Cores neutras
  background: '#F8F9FA',     // Fundo principal
  card: '#FFFFFF',           // Cards
  border: '#E0E0E0',         // Bordas
  
  // Texto
  text: {
    primary: '#333333',      // Texto principal
    secondary: '#757575',    // Texto secundário
    light: '#9E9E9E',        // Texto claro
    inverse: '#FFFFFF',      // Texto em backgrounds escuros
  },

  // Cores por espécie de pet (para avatares futuros)
  species: {
    Cachorro: '#FF6B9D',     // Rosa
    Gato: '#9C27B0',         // Roxo
    Pássaro: '#FFB74D',      // Laranja claro
    Coelho: '#8D6E63',       // Marrom
    Hamster: '#FFA726',      // Laranja
    Peixe: '#29B6F6',        // Azul claro
    Réptil: '#66BB6A',       // Verde
    Outro: '#90A4AE',        // Cinza azulado
  },
};

// Helper para obter cor por categoria
export const getCategoryColor = (category: 'Saúde' | 'Higiene' | 'Consulta' | 'Outro') => {
  return Theme.categories[category] || Theme.categories.Outro;
};

// Helper para obter cor por espécie
export const getSpeciesColor = (species: string) => {
  return Theme.species[species as keyof typeof Theme.species] || Theme.species.Outro;
};

