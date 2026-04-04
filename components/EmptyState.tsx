import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Colors';
import AnimatedButton from './animations/AnimatedButton';

type EmptyStateProps = {
  title: string;
  message: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
} & (
  | { icon: keyof typeof Ionicons.glyphMap; iconLib?: 'ionicons' }
  | { icon: keyof typeof MaterialCommunityIcons.glyphMap; iconLib: 'mci' }
);

const EmptyState = ({ icon, iconLib = 'ionicons', title, message, hint, actionLabel, onAction, style }: EmptyStateProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, style, { opacity, transform: [{ scale }] }]}>
      <View style={styles.iconCircle}>
        {iconLib === 'mci'
          ? <MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} size={60} color={Theme.primary} />
          : <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={60} color={Theme.primary} />
        }
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {!!hint && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      )}
      {actionLabel && onAction && (
        <AnimatedButton onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </AnimatedButton>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Theme.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Theme.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  hintBox: {
    backgroundColor: Theme.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    maxWidth: 280,
  },
  hintText: {
    fontSize: 13,
    color: Theme.primary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: Theme.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmptyState;
