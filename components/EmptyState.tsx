import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Colors';
import AnimatedButton from './animations/AnimatedButton';

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
} & (
  | { icon: keyof typeof Ionicons.glyphMap; iconLib?: 'ionicons' }
  | { icon: keyof typeof MaterialCommunityIcons.glyphMap; iconLib: 'mci' }
);

const EmptyState = ({ icon, iconLib = 'ionicons', title, message, actionLabel, onAction, style }: EmptyStateProps) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        {iconLib === 'mci'
          ? <MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} size={60} color={Theme.primary} />
          : <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={60} color={Theme.primary} />
        }
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <AnimatedButton onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </AnimatedButton>
      )}
    </View>
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
