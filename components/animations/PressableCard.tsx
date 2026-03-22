import React from 'react';
import { ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

interface PressableCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  scaleValue?: number;
  haptic?: boolean;
  activeOpacity?: number;
}

/**
 * Card com animação spring no press usando reanimated.
 * Substitui TouchableOpacity em cards que precisam de feedback mais rico.
 */
const PressableCard = ({
  children,
  style,
  onPress,
  scaleValue = 0.97,
  haptic = true,
}: PressableCardProps) => {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(1);

  const tap = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(scaleValue, { damping: 20, stiffness: 500 });
      shadowOpacity.value = withSpring(0.4);
    })
    .onFinalize((_, success) => {
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      shadowOpacity.value = withSpring(1);
      if (success && onPress) {
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: shadowOpacity.value,
  }));

  const styleArray = Array.isArray(style) ? style : style ? [style] : [];

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[...styleArray, animStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

export default PressableCard;
