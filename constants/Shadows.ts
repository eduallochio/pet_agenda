import { Platform } from 'react-native';

const hexToRgba = (hex: string, opacity: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const createShadow = (
  elevation: number,
  shadowColor: string = '#000',
  shadowOpacity: number = 0.15
) => {
  if (Platform.OS === 'web') {
    const offsetY = elevation / 2;
    const blur = elevation;
    return {
      boxShadow: `0px ${offsetY}px ${blur}px ${hexToRgba(shadowColor, shadowOpacity)}`,
    };
  }
  return {
    shadowColor,
    shadowOffset: { width: 0, height: elevation / 2 },
    shadowOpacity,
    shadowRadius: elevation,
    elevation,
  };
};

export const Shadows = {
  small:      createShadow(2, '#000', 0.1),
  medium:     createShadow(4, '#000', 0.15),
  large:      createShadow(8, '#000', 0.2),
  extraLarge: createShadow(12, '#000', 0.25),
  primary:    createShadow(6, '#40E0D0', 0.3),
};
