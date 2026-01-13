import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shadows } from '../constants/Shadows';
import { Theme } from '../constants/Colors';

interface IconInputProps extends TextInputProps {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export default function IconInput({ iconName, iconColor = Theme.text.secondary, ...props }: IconInputProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={iconName} size={20} color={iconColor} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholderTextColor={Theme.text.light}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.card,
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
    color: Theme.text.primary,
  },
});
