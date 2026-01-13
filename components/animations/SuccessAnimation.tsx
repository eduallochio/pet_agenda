import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SuccessAnimationProps {
  visible: boolean;
  onAnimationEnd?: () => void;
}

const SuccessAnimation = ({ visible, onAnimationEnd }: SuccessAnimationProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Sequência: aparecer com bounce, segurar, depois desaparecer
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1500),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        scaleAnim.setValue(0);
        if (onAnimationEnd) {
          onAnimationEnd();
        }
      });
    }
  }, [visible, scaleAnim, opacityAnim, onAnimationEnd]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  iconContainer: {
    backgroundColor: '#fff',
    borderRadius: 60,
    padding: 20,
  },
});

export default SuccessAnimation;
