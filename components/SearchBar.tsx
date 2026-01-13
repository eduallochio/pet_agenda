import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export default function SearchBar({ 
  value, 
  onChangeText, 
  placeholder = 'Buscar...', 
  onClear 
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={Theme.text.secondary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Theme.text.light}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear || (() => onChangeText(''))}>
          <Ionicons name="close-circle" size={20} color={Theme.text.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.card,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    ...Shadows.small,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Theme.text.primary,
  },
});
