import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { Shadows } from '../constants/Shadows';
import { Pet, VaccineRecord } from '../types/pet';
import { useTranslation } from 'react-i18next';

interface UpcomingVaccinesCardProps {
  pets: Pet[];
  vaccines: VaccineRecord[];
}

function parseDate(s: string): Date {
  const p = s.split('/');
  if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(s);
}

export default function UpcomingVaccinesCard({ pets, vaccines }: UpcomingVaccinesCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Filtrar vacinas que vencem nos próximos 30 dias (incluindo vencidas)
  const upcoming = vaccines.filter(v => {
    if (!v.nextDueDate) return false;
    const d = parseDate(v.nextDueDate);
    d.setHours(0, 0, 0, 0);
    return d <= in30Days;
  });

  if (upcoming.length === 0) return null;

  // Agrupar por pet (máx 3 pets para exibição)
  const petIds = [...new Set(upcoming.map(v => v.petId))];
  const displayPets = petIds.slice(0, 3).map(id => {
    const pet = pets.find(p => p.id === id);
    const petVaccines = upcoming.filter(v => v.petId === id);
    const overdue = petVaccines.some(v => parseDate(v.nextDueDate!).setHours(0,0,0,0) < today.getTime());
    return { pet, count: petVaccines.length, overdue };
  }).filter(x => x.pet);

  const hasOverdue = upcoming.some(v => {
    const d = parseDate(v.nextDueDate!);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  const accentColor = hasOverdue ? '#F44336' : '#4CAF50';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => router.push('/(tabs)')}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: accentColor + '18' }]}>
          <MaterialCommunityIcons name="needle" size={20} color={accentColor} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.label, { color: colors.text.light }]}>
            {t('vaccineCard.label')}
          </Text>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {hasOverdue ? t('vaccineCard.titleOverdue') : t('vaccineCard.title')}
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.countText}>{upcoming.length}</Text>
        </View>
      </View>

      {/* Lista de pets */}
      <View style={styles.petList}>
        {displayPets.map(({ pet, count, overdue }) => (
          <View key={pet!.id} style={[styles.petRow, { borderColor: colors.border }]}>
            <MaterialCommunityIcons
              name="paw"
              size={14}
              color={overdue ? '#F44336' : '#4CAF50'}
              style={styles.petIcon}
            />
            <Text style={[styles.petName, { color: colors.text.primary }]} numberOfLines={1}>
              {pet!.name}
            </Text>
            <Text style={[styles.petCount, { color: overdue ? '#F44336' : colors.text.secondary }]}>
              {count} {count === 1 ? t('vaccineCard.vaccine') : t('vaccineCard.vaccines')}
              {overdue ? ` · ${t('vaccineCard.overdue')}` : ''}
            </Text>
          </View>
        ))}
        {petIds.length > 3 && (
          <Text style={[styles.moreText, { color: colors.text.light }]}>
            +{petIds.length - 3} {t('vaccineCard.morePets')}
          </Text>
        )}
      </View>

      {/* CTA */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.ctaText, { color: accentColor }]}>
          {t('vaccineCard.cta')}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={accentColor} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  petList: { gap: 6, marginBottom: 10 },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
  },
  petIcon: { marginRight: 6 },
  petName: { flex: 1, fontSize: 13, fontWeight: '600' },
  petCount: { fontSize: 12 },
  moreText: { fontSize: 11, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 0.5,
    gap: 2,
  },
  ctaText: { fontSize: 12, fontWeight: '700' },
});
