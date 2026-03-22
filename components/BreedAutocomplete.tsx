import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { getBreedsBySpecies } from '../constants/breedInfo';
import { Theme } from '../constants/Colors';
import { useTranslation } from 'react-i18next';

interface Props {
  species: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string | null;
}

export default function BreedAutocomplete({ species, value, onChangeText, onBlur, error }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!species || species === 'Outro') return [];
    const all = getBreedsBySpecies(species);
    if (!value.trim()) return all;
    const q = value.trim().toLowerCase();
    return all.filter(b => b.toLowerCase().includes(q));
  }, [species, value]);

  const showDropdown = focused && suggestions.length > 0;

  const handleSelect = (breed: string) => {
    onChangeText(breed);
    setFocused(false);
  };

  const borderColor = error ? '#DC3545' : focused ? Theme.primary : colors.border;

  // Sombra do dropdown: inline no web (boxShadow), nativo nas outras plataformas
  const dropdownShadow = Platform.OS === 'web'
    ? ({ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' } as any)
    : { elevation: 8 };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor }]}>
        <Ionicons
          name="heart-outline"
          size={20}
          color={focused ? Theme.primary : colors.text.light}
          style={styles.icon}
        />
        <TextInput
          style={[styles.input, { color: colors.text.primary }]}
          placeholder={t('addPet.breedPlaceholder')}
          placeholderTextColor={colors.text.light}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => {
              setFocused(false);
              onBlur?.();
            }, 150);
          }}
        />
        {!!value && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.text.light} />
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }, dropdownShadow]}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            style={styles.dropdownScroll}
          >
            {suggestions.map((breed, i) => {
              const isLast = i === suggestions.length - 1;
              const isMatch = value.trim() && breed.toLowerCase().startsWith(value.trim().toLowerCase());
              return (
                <TouchableOpacity
                  key={breed}
                  style={[
                    styles.suggestion,
                    { borderBottomColor: colors.border },
                    isLast && styles.suggestionLast,
                  ]}
                  onPress={() => handleSelect(breed)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="paw-outline" size={14} color={colors.text.light} style={styles.suggestionIcon} />
                  <Text style={[styles.suggestionText, { color: colors.text.primary }]}>{breed}</Text>
                  {!!isMatch && (
                    <View style={styles.matchDot}>
                      <View style={[styles.matchDotInner, { backgroundColor: Theme.primary }]} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%' as any,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 200,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionLast: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    flex: 1,
  },
  matchDot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
