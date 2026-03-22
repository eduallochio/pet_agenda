import { useTheme as useThemeContext } from '../contexts/ThemeContext';

export { useTheme } from '../contexts/ThemeContext';

// Hook convenience para acessar apenas as cores
export function useColors() {
  const { colors } = useThemeContext();
  return colors;
}

// Hook para verificar se está em modo escuro
export function useIsDarkMode() {
  const { isDarkMode } = useThemeContext();
  return isDarkMode;
}