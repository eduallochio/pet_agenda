import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type ThemeType = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: ThemeType;
  isDarkMode: boolean;
  setTheme: (theme: ThemeType) => void;
  colors: ColorScheme;
}

interface ColorScheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  surface: string;
  card: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    light: string;
    inverse: string;
  };
  shadow: string;
}

const lightColors: ColorScheme = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#5AC8FA',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E5EA',
  text: {
    primary: '#000000',
    secondary: '#3C3C43',
    light: '#8E8E93',
    inverse: '#FFFFFF',
  },
  shadow: '#000000',
};

const darkColors: ColorScheme = {
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  success: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
  info: '#64D2FF',
  background: '#000000',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  border: '#38383A',
  text: {
    primary: '#FFFFFF',
    secondary: '#EBEBF5',
    light: '#8E8E93',
    inverse: '#000000',
  },
  shadow: '#000000',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeType>('auto');
  const systemColorScheme = useColorScheme();

  // Determinar se deve usar modo escuro
  const isDarkMode = theme === 'dark' || (theme === 'auto' && systemColorScheme === 'dark');

  // Selecionar esquema de cores
  const colors = isDarkMode ? darkColors : lightColors;

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setThemeState(savedTheme as ThemeType);
      }
    } catch (error) {
      console.warn('Erro ao carregar preferência de tema:', error);
    }
  };

  const setTheme = async (newTheme: ThemeType) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.warn('Erro ao salvar preferência de tema:', error);
    }
  };

  const value: ThemeContextType = {
    theme,
    isDarkMode,
    setTheme,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}