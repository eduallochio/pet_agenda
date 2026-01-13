import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Shadows } from '../constants/Shadows';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  style?: any;
}

export const SkeletonCard = ({ style }: SkeletonCardProps) => (
  <View style={[styles.card, style]}>
    <View style={styles.cardHeader}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    ...Shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default Skeleton;
