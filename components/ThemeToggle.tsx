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
  const { theme, setTheme, colors, isDarkMode } = useTheme();
  const { t } = useTranslation();

  const themeOptions: { value: ThemeType; label: string; icon: string }[] = [
    { value: 'light', label: t('theme.light'), icon: 'sunny' },
    { value: 'dark', label: t('theme.dark'), icon: 'moon' },
    { value: 'auto', label: t('theme.auto'), icon: 'phone-portrait' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, style]}>
      {showLabels && (
        <View style={styles.header}>
          <Ionicons 
            name="color-palette-outline" 
            size={20} 
            color={colors.text.primary} 
          />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('theme.title')}
          </Text>
        </View>
      )}
      
      <View style={styles.optionsContainer}>
        {themeOptions.map((option) => {
          const isSelected = theme === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                { 
                  backgroundColor: isSelected ? colors.primary : colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
                isSelected && Shadows.small,
              ]}
              onPress={() => setTheme(option.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon as any}
                size={24}
                color={isSelected ? colors.text.inverse : colors.text.secondary}
              />
              {showLabels && (
                <Text
                  style={[
                    styles.optionText,
                    { 
                      color: isSelected ? colors.text.inverse : colors.text.secondary,
                      fontWeight: isSelected ? '600' : 'normal',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {showLabels && (
        <Text style={[styles.subtitle, { color: colors.text.light }]}>
          {theme === 'auto'
            ? t('theme.followingSystem', { mode: isDarkMode ? t('theme.systemDark') : t('theme.systemLight') })
            : theme === 'light' ? t('theme.activeLight') : t('theme.activeDark')
          }
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  option: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  optionText: {
    fontSize: 14,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});