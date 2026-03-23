import React from 'react';
import { TouchableOpacity, ViewStyle, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PressableCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  scaleValue?: number;
  haptic?: boolean;
  activeOpacity?: number;
}

const PressableCard = ({
  children,
  style,
  onPress,
  haptic = true,
  activeOpacity = 0.85,
}: PressableCardProps) => {
  const handlePress = () => {
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (onPress) onPress();
  };

  const styleArray = Array.isArray(style) ? style : style ? [style] : [];

  return (
    <TouchableOpacity
      style={styleArray}
      onPress={handlePress}
      activeOpacity={activeOpacity}
    >
      {children}
    </TouchableOpacity>
  );
};

export default PressableCard;
