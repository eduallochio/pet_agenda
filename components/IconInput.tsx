import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shadows } from '../constants/Shadows';
import { useTheme } from '../hooks/useTheme';

interface IconInputProps extends TextInputProps {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export default function IconInput({ iconName, iconColor, ...props }: IconInputProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Ionicons name={iconName} size={20} color={iconColor ?? colors.text.secondary} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: colors.text.primary }]}
        placeholderTextColor={colors.text.light}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    ...Shadows.small,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
});
