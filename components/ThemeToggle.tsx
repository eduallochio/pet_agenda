import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType } from '../contexts/ThemeContext';
import { Shadows } from '../constants/Shadows';
import { useTranslation } from 'react-i18next';

interface ThemeToggleProps {
  showLabels?: boolean;
  style?: any;
}

export default function ThemeToggle({ showLabels = true, style }: ThemeToggleProps) {
  const { theme, setTheme, colors } = useTheme();
  const { t } = useTranslation();

  const themeOptions: { value: ThemeType; icon: string }[] = [
    { value: 'light', icon: 'sunny-outline' },
    { value: 'dark',  icon: 'moon-outline' },
    { value: 'auto',  icon: 'phone-portrait-outline' },
  ];

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }, style]}>
      {/* Ícone + título à esquerda */}
      <View style={styles.left}>
        <Ionicons name="color-palette-outline" size={20} color={colors.text.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t('theme.title')}
        </Text>
      </View>

      {/* Botões compactos à direita */}
      <View style={[styles.btnGroup, { backgroundColor: colors.background }]}>
        {themeOptions.map((option) => {
          const isSelected = theme === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.btn,
                isSelected && { backgroundColor: colors.surface, ...Shadows.small },
              ]}
              onPress={() => setTheme(option.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={isSelected ? colors.text.primary : colors.text.secondary}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
  },
  btnGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});