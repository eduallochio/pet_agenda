import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSpeciesColor } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

interface PetAvatarProps {
  species: string;
  photoUri?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: ViewStyle;
}

const getSpeciesIcon = (species: string): MCIName => {
  const s = species.toLowerCase();
  if (s.includes('cachorro') || s.includes('dog') || s.includes('cão')) return 'dog';
  if (s.includes('gato') || s.includes('cat')) return 'cat';
  if (s.includes('pássaro') || s.includes('passaro') || s.includes('bird')) return 'bird';
  if (s.includes('coelho') || s.includes('rabbit')) return 'rabbit';
  if (s.includes('hamster')) return 'rodent';
  if (s.includes('peixe') || s.includes('fish')) return 'fish';
  if (s.includes('tartaruga') || s.includes('turtle')) return 'tortoise';
  if (s.includes('réptil') || s.includes('reptil') || s.includes('lagarto')) return 'snake';
  return 'paw';
};

const sizeMap = {
  small:  { container: { width: 40,  height: 40,  borderRadius: 20 }, icon: 22 },
  medium: { container: { width: 60,  height: 60,  borderRadius: 30 }, icon: 32 },
  large:  { container: { width: 80,  height: 80,  borderRadius: 40 }, icon: 44 },
  xlarge: { container: { width: 100, height: 100, borderRadius: 50 }, icon: 56 },
};

const PetAvatar = ({ species, photoUri, size = 'medium', style }: PetAvatarProps) => {
  const color = getSpeciesColor(species);
  const { container: sizeStyles, icon: iconSize } = sizeMap[size];
  const iconName = getSpeciesIcon(species);

  return (
    <View style={[
      styles.avatar,
      sizeStyles,
      { backgroundColor: photoUri ? 'transparent' : color },
      style
    ]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={[styles.petPhoto, sizeStyles]} />
      ) : (
        <MaterialCommunityIcons name={iconName} size={iconSize} color="#fff" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.small,
  },
  petPhoto: {
    width: '100%',
    height: '100%',
  },
});

export default PetAvatar;
