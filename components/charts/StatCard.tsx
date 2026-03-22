import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../hooks/useTheme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle?: string;
}

export default function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, {
      backgroundColor: colors.surface,
      borderLeftColor: color,
      borderLeftWidth: 4,
      ...Shadows.small,
    }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text.light }]}>{title}</Text>
          <Text style={[styles.value, { color }]}>{value}</Text>
          {!!subtitle && <Text style={[styles.subtitle, { color: colors.text.light }]}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
