import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform, ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { Pet } from '../types/pet';

interface SelectPetModalProps {
  visible: boolean;
  pets: Pet[];
  title?: string;
  onSelect: (pet: Pet) => void;
  onClose: () => void;
}

function speciesEmoji(species: string) {
  const l = (species || '').toLowerCase();
  if (l.includes('cachorro') || l.includes('dog')) return '🐕';
  if (l.includes('gato') || l.includes('cat')) return '🐈';
  if (l.includes('pássaro') || l.includes('bird')) return '🐦';
  if (l.includes('coelho')) return '🐰';
  if (l.includes('peixe')) return '🐠';
  return '🐾';
}

export default function SelectPetModal({
  visible,
  pets,
  title = 'Selecionar pet',
  onSelect,
  onClose,
}: SelectPetModalProps) {
  const { colors } = useTheme();
  const scale   = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      scale.setValue(0.88);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.card, { backgroundColor: colors.surface, transform: [{ scale }], opacity }]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Título */}
          <View style={styles.header}>
            <Ionicons name="paw" size={20} color={Theme.primary} />
            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          </View>

          {/* Lista de pets */}
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {pets.map((pet, i) => (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petRow,
                  { borderColor: colors.border },
                  i < pets.length - 1 && { borderBottomWidth: 1 },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  onSelect(pet);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.petEmojiBg, { backgroundColor: Theme.primary + '15' }]}>
                  <Text style={styles.petEmoji}>{speciesEmoji(pet.species)}</Text>
                </View>
                <View style={styles.petInfo}>
                  <Text style={[styles.petName, { color: colors.text.primary }]}>{pet.name}</Text>
                  <Text style={[styles.petMeta, { color: colors.text.secondary }]}>
                    {[pet.species, pet.breed].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Botão cancelar */}
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelText, { color: colors.text.secondary }]}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    maxHeight: '70%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700' },
  petRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
  },
  petEmojiBg: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  petEmoji:  { fontSize: 22 },
  petInfo:   { flex: 1 },
  petName:   { fontSize: 15, fontWeight: '600' },
  petMeta:   { fontSize: 12, marginTop: 2 },
  cancelBtn: {
    margin: 12, marginTop: 8,
    borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
