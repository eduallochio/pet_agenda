import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Reminder, VaccineRecord, Pet } from '../types/pet';

type TodayItem = {
  id: string;
  type: 'reminder' | 'birthday' | 'vaccine';
  label: string;
  petName: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  pets: Pet[];
  reminders: Reminder[];
  vaccines: VaccineRecord[];
  onPress?: () => void;
};

function parseDate(s: string): Date {
  const p = s.split('/');
  if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(s);
}

const CATEGORY_COLOR: Record<string, string> = {
  Saúde: '#4CAF50',
  Higiene: '#2196F3',
  Consulta: '#FF9800',
  Outro: '#9E9E9E',
};

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Saúde: 'medical',
  Higiene: 'water',
  Consulta: 'calendar',
  Outro: 'ellipse-outline',
};

export default function TodayWidget({ pets, reminders, vaccines, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items: TodayItem[] = [];

  // Lembretes de hoje (excluindo os já concluídos)
  for (const r of reminders) {
    if (r.completed) continue;
    const d = parseDate(r.date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      const pet = pets.find(p => p.id === r.petId);
      items.push({
        id: r.id,
        type: 'reminder',
        label: r.description,
        petName: pet?.name ?? 'Pet',
        color: CATEGORY_COLOR[r.category] ?? '#9E9E9E',
        icon: CATEGORY_ICON[r.category] ?? 'ellipse-outline',
      });
    }
  }

  // Vacinas com reforço hoje
  for (const v of vaccines) {
    if (!v.nextDueDate) continue;
    const d = parseDate(v.nextDueDate);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      const pet = pets.find(p => p.id === v.petId);
      items.push({
        id: v.id,
        type: 'vaccine',
        label: v.vaccineName,
        petName: pet?.name ?? 'Pet',
        color: '#E91E63',
        icon: 'medical',
      });
    }
  }

  // Aniversários de hoje
  for (const p of pets) {
    if (!p.dob) continue;
    const parts = p.dob.split('/');
    if (parts.length !== 3) continue;
    if (
      parseInt(parts[0]) === today.getDate() &&
      parseInt(parts[1]) - 1 === today.getMonth()
    ) {
      const age = today.getFullYear() - parseInt(parts[2]);
      items.push({
        id: `bday-${p.id}`,
        type: 'birthday',
        label: age === 1 ? t('today.birthdayAge1') : t('today.birthdayAge', { count: age }),
        petName: p.name,
        color: '#FF6B9D',
        icon: 'gift',
      });
    }
  }

  if (items.length === 0) return null;

  const MAX_VISIBLE = 3;
  const visible = items.slice(0, MAX_VISIBLE);
  const extra = items.length - MAX_VISIBLE;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: Theme.primary + '40' },
        Platform.OS === 'web'
          ? { boxShadow: '0 2px 10px rgba(64,224,208,0.15)' } as any
          : { shadowColor: Theme.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerDot, { backgroundColor: Theme.primary }]} />
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('today.title')}</Text>
        </View>
        <Text style={[styles.headerCount, { color: Theme.primary }]}>
          {items.length} {items.length === 1 ? t('today.event') : t('today.events')}
        </Text>
      </View>

      {/* Items */}
      {visible.map(item => (
        <View key={item.id} style={styles.item}>
          <View style={[styles.itemIcon, { backgroundColor: item.color + '18' }]}>
            <Ionicons name={item.icon} size={14} color={item.color} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[styles.itemLabel, { color: colors.text.primary }]} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={[styles.itemPet, { color: colors.text.secondary }]}>{item.petName}</Text>
          </View>
          {item.type === 'birthday' && (
            <MaterialCommunityIcons name="cake-variant-outline" size={16} color="#FF6B9D" />
          )}
          {item.type === 'vaccine' && (
            <MaterialCommunityIcons name="needle" size={16} color="#E91E63" />
          )}
        </View>
      ))}

      {extra > 0 && (
        <Text style={[styles.extra, { color: Theme.primary }]}>
          +{extra} mais → ver calendário
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  headerCount: { fontSize: 12, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 13, fontWeight: '600' },
  itemPet: { fontSize: 11, marginTop: 1 },
  extra: { fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'right' },
});
