import React from 'react';
import { StyleProp, ViewStyle, TouchableOpacityProps, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  scaleValue = 0.95,
  haptic = false,
  ...props
}: AnimatedButtonProps) => {
  const scale = useSharedValue(1);

  const tap = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(scaleValue, { damping: 15, stiffness: 400 });
    })
    .onFinalize((e, success) => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      if (success && onPress) {
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        // @ts-ignore — onPress type mismatch with gesture handler, safe to call
        onPress(e as any);
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flatStyle = StyleSheet.flatten(style) ?? {};

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[flatStyle, animStyle]} {...(props as any)}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

export default AnimatedButton;
