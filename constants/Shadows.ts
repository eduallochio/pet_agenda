import { Platform } from 'react-native';

const createShadow = (
  elevation: number,
  shadowColor: string = '#000',
  shadowOpacity: number = 0.15
) => {
  if (Platform.OS === 'web') return {};
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
