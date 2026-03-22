import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  /** Se true, anima também translateY (slide up) */
  slide?: boolean;
}

const FadeIn = ({ children, duration = 350, delay = 0, style, slide = true }: FadeInProps) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slide ? 16 : 0);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration, easing }));
    if (slide) {
      translateY.value = withDelay(delay, withTiming(0, { duration, easing }));
    }
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      {children}
    </Animated.View>
  );
};

export default FadeIn;
