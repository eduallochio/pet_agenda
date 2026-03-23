import React from 'react';
import { TouchableOpacity, StyleProp, ViewStyle, TouchableOpacityProps, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  haptic?: boolean;
}

const AnimatedButton = ({
  children,
  onPress,
  style,
  haptic = false,
  ...props
}: AnimatedButtonProps) => {
  const handlePress = (e: any) => {
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (onPress) onPress(e);
  };

  return (
    <TouchableOpacity
      style={style}
      onPress={handlePress}
      activeOpacity={0.8}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

export default AnimatedButton;
