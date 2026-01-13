import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { getSpeciesColor } from '../constants/Colors';

interface PetAvatarProps {
  species: string;
  photoUri?: string; // URI da foto real do pet
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: ViewStyle;
}

const PetAvatar = ({ species, photoUri, size = 'medium', style }: PetAvatarProps) => {
  const getSpeciesEmoji = (species: string): string => {
    const lowerSpecies = species.toLowerCase();
    if (lowerSpecies.includes('cachorro') || lowerSpecies.includes('dog') || lowerSpecies.includes('cão')) {
      return '🐕';
    }
    if (lowerSpecies.includes('gato') || lowerSpecies.includes('cat')) {
      return '🐈';
    }
    if (lowerSpecies.includes('pássaro') || lowerSpecies.includes('pássaro') || lowerSpecies.includes('bird')) {
      return '🦜';
    }
    if (lowerSpecies.includes('coelho') || lowerSpecies.includes('rabbit')) {
      return '🐰';
    }
    if (lowerSpecies.includes('hamster')) {
      return '🐹';
    }
    if (lowerSpecies.includes('peixe') || lowerSpecies.includes('fish')) {
      return '🐠';
    }
    if (lowerSpecies.includes('tartaruga') || lowerSpecies.includes('turtle')) {
      return '🐢';
    }
    if (lowerSpecies.includes('réptil') || lowerSpecies.includes('reptile') || lowerSpecies.includes('lagarto')) {
      return '🦎';
    }
    return '🐾'; // Default
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40, borderRadius: 20 };
      case 'medium':
        return { width: 60, height: 60, borderRadius: 30 };
      case 'large':
        return { width: 80, height: 80, borderRadius: 40 };
      case 'xlarge':
        return { width: 100, height: 100, borderRadius: 50 };
      default:
        return { width: 60, height: 60, borderRadius: 30 };
    }
  };

  const getEmojiSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'medium':
        return 30;
      case 'large':
        return 40;
      case 'xlarge':
        return 50;
      default:
        return 30;
    }
  };

  const color = getSpeciesColor(species);
  const sizeStyles = getSizeStyles();
  const emoji = getSpeciesEmoji(species);

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
        <Text style={[styles.emoji, { fontSize: getEmojiSize() }]}>
          {emoji}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  petPhoto: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    textAlign: 'center',
  },
});

export default PetAvatar;
