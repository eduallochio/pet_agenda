import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';

interface FilterChip {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  showClearAll?: boolean;
  onClearAll?: () => void;
}

export default function FilterChips({ 
  chips, 
  selectedIds, 
  onToggle, 
  showClearAll = true,
  onClearAll 
}: FilterChipsProps) {
  const hasSelection = selectedIds.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {showClearAll && hasSelection && (
          <TouchableOpacity 
            style={[styles.chip, styles.clearChip]} 
            onPress={onClearAll}
          >
            <Ionicons name="close-circle" size={16} color={Theme.text.secondary} style={styles.chipIcon} />
            <Text style={styles.clearChipText}>Limpar</Text>
          </TouchableOpacity>
        )}
        
        {chips.map((chip) => {
          const isSelected = selectedIds.includes(chip.id);
          const chipColor = chip.color || Theme.primary;
          
          return (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.chip,
                isSelected && { backgroundColor: chipColor, borderColor: chipColor }
              ]}
              onPress={() => onToggle(chip.id)}
            >
              {chip.icon && (
                <Ionicons 
                  name={chip.icon} 
                  size={16} 
                  color={isSelected ? '#fff' : chipColor} 
                  style={styles.chipIcon}
                />
              )}
              <Text style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
                !isSelected && { color: chipColor }
              ]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  scrollContent: {
    paddingVertical: 5,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Theme.card,
    borderWidth: 1.5,
    borderColor: Theme.border,
    ...Shadows.small,
  },
  clearChip: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text.primary,
  },
  chipTextSelected: {
    color: '#fff',
  },
  clearChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text.secondary,
  },
});
