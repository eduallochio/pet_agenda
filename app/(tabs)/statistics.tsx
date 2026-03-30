import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, FlatList,
} from 'react-native';
import { Shadows } from '../../constants/Shadows';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pet, Reminder, VaccineRecord } from '../../types/pet';
import { Theme, getCategoryColor } from '../../constants/Colors';
import { useTheme } from '../../hooks/useTheme';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../../hooks/useAchievements';
import { useTranslation } from 'react-i18next';

// ─── helpers ────────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date(dateStr);
}

function isDateUpcoming(dateStr: string): boolean {
  return parseDate(dateStr) > new Date();
}

function getSpeciesColor(species: string): string {
  const map: Record<string, string> = {
    Cachorro: '#FF6B6B',
    Gato: '#4ECDC4',
    Pássaro: '#FFE66D',
    Peixe: '#95E1D3',
    Hamster: '#F38181',
    Coelho: '#AA96DA',
  };
  return map[species] || '#A8DADC';
}

function getSpeciesIcon(species: string): string {
  const map: Record<string, string> = {
    Cachorro: 'dog',
    Gato: 'cat',
    Pássaro: 'bird',
    Peixe: 'fish',
    Hamster: 'rodent',
    Coelho: 'rabbit',
  };
  return map[species] || 'paw';
}

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function BigStatCard({
  value, label, icon, color, sub, subIsAlert,
}: {
  value: number; label: string; icon: string; color: string; sub?: string; subIsAlert?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bigCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.bigCardIcon, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon as MCIName} size={28} color={color} />
      </View>
      <Text style={[styles.bigCardValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.bigCardLabel, { color: colors.text.secondary }]}>{label}</Text>
      {!!sub && (
        <View style={[styles.bigCardSub, { backgroundColor: subIsAlert ? '#F4433618' : color + '12' }]}>
          <Text style={[styles.bigCardSubText, { color: subIsAlert ? '#F44336' : color }]}>{sub}</Text>
        </View>
      )}
    </View>
  );
}

function SectionHeader({ title, icon, color }: { title: string; icon: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionHeaderIcon, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon as MCIName} size={16} color={color} />
      </View>
      <Text style={[styles.sectionHeaderText, { color: colors.text.primary }]}>{title}</Text>
    </View>
  );
}

function HorizontalBar({
  label, count, total, color, sub,
}: {
  label: string; count: number; total: number; color: string; sub?: string;
}) {
  const { colors } = useTheme();
  const pct = total > 0 ? count / total : 0;
  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <View style={[styles.barDot, { backgroundColor: color }]} />
        <Text style={[styles.barLabel, { color: colors.text.primary }]}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!!sub && (
            <View style={[styles.barSubBadge, { backgroundColor: color + '18' }]}>
              <Text style={[styles.barSubText, { color }]}>{sub}</Text>
            </View>
          )}
          <Text style={[styles.barCount, { color: colors.text.secondary }]}>{count}</Text>
        </View>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function HealthStatusRow({
  label, value, max, color, icon,
}: {
  label: string; value: number; max: number; color: string; icon: string;
}) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={styles.healthRow}>
      <View style={[styles.healthIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.healthInfo}>
        <View style={styles.healthLabelRow}>
          <Text style={[styles.healthLabel, { color: colors.text.primary }]}>{label}</Text>
          <Text style={[styles.healthVal, { color }]}>{value}/{max}</Text>
        </View>
        <View style={[styles.healthTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.healthFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

function SpeciesChip({ species, count, color }: { species: string; count: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.speciesChip, { backgroundColor: colors.surface, borderColor: color + '40' }]}>
      <View style={[styles.speciesChipIcon, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={getSpeciesIcon(species) as MCIName} size={18} color={color} />
      </View>
      <Text style={[styles.speciesName, { color: colors.text.primary }]}>{species}</Text>
      <View style={[styles.speciesCountBadge, { backgroundColor: color }]}>
        <Text style={styles.speciesCount}>{count}</Text>
      </View>
    </View>
  );
}

function TimelineCard({
  event, isLast,
}: {
  event: { id: string; date: string; title: string; type: 'past' | 'upcoming'; petName: string };
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isUpcoming = event.type === 'upcoming';
  const color = isUpcoming ? Theme.primary : Theme.success;
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlLeft}>
        <View style={[styles.tlDot, { backgroundColor: color, borderColor: color + '30' }]} />
        {!isLast && <View style={[styles.tlLine, { backgroundColor: colors.border }]} />}
      </View>
      <View style={[styles.tlCard, {
        backgroundColor: colors.surface,
        borderColor: isUpcoming ? color + '30' : colors.border,
        borderLeftColor: color,
        marginBottom: isLast ? 0 : 10,
      }]}>
        <View style={styles.tlCardTop}>
          <View style={[styles.tlBadge, { backgroundColor: isUpcoming ? color + '18' : color + '12' }]}>
            <Ionicons
              name={isUpcoming ? 'time-outline' : 'checkmark-circle'}
              size={12}
              color={color}
            />
            <Text style={[styles.tlBadgeText, { color }]}>
              {isUpcoming ? t('statistics.timeline.upcoming') : t('statistics.timeline.applied')}
            </Text>
          </View>
          <Text style={[styles.tlDate, { color: colors.text.light }]}>{event.date}</Text>
        </View>
        <Text style={[styles.tlTitle, { color: colors.text.primary }]}>{event.title}</Text>
        <View style={styles.tlPetRow}>
          <MaterialCommunityIcons name="paw" size={11} color={colors.text.light} />
          <Text style={[styles.tlPet, { color: colors.text.secondary }]}> {event.petName}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Tela principal ──────────────────────────────────────────────────────────

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const [pd, rd, vd, unlocked] = await Promise.all([
            AsyncStorage.getItem('pets'),
            AsyncStorage.getItem('reminders'),
            AsyncStorage.getItem('vaccinations'),
            getUnlockedAchievements(),
          ]);
          setPets(pd ? JSON.parse(pd) : []);
          setReminders(rd ? JSON.parse(rd) : []);
          setVaccines(vd ? JSON.parse(vd) : []);
          setAchievementsCount(unlocked.length);
        } catch {
          // silently fail
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [])
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // ── Dados filtrados pelo pet selecionado ────────────────────────────────────
  const filteredPets      = selectedPetId ? pets.filter(p => p.id === selectedPetId) : pets;
  const filteredReminders = selectedPetId ? reminders.filter(r => r.petId === selectedPetId) : reminders;
  const filteredVaccines  = selectedPetId ? vaccines.filter(v => v.petId === selectedPetId) : vaccines;

  const totalPets      = filteredPets.length;
  const totalReminders = filteredReminders.length;
  const totalVaccines  = filteredVaccines.length;

  const overdueReminders = filteredReminders.filter(r => {
    const d = parseDate(r.date); d.setHours(0, 0, 0, 0); return d < now;
  }).length;

  const overdueVaccines = filteredVaccines.filter(v => {
    if (!v.nextDueDate) return false;
    const d = parseDate(v.nextDueDate); d.setHours(0, 0, 0, 0); return d < now;
  }).length;

  const upcoming30 = filteredReminders.filter(r => {
    const d = parseDate(r.date);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return d >= now && d <= in30;
  }).length;

  const remindersByCategory = [
    { name: 'Saúde',    count: filteredReminders.filter(r => r.category === 'Saúde').length,    color: getCategoryColor('Saúde').main },
    { name: 'Higiene',  count: filteredReminders.filter(r => r.category === 'Higiene').length,  color: getCategoryColor('Higiene').main },
    { name: 'Consulta', count: filteredReminders.filter(r => r.category === 'Consulta').length, color: getCategoryColor('Consulta').main },
    { name: 'Outro',    count: filteredReminders.filter(r => r.category === 'Outro').length,    color: getCategoryColor('Outro').main },
  ].filter(c => c.count > 0);

  const petsBySpecies = pets.reduce((acc, pet) => {
    const sp = pet.species || 'Outro';
    const ex = acc.find(i => i.name === sp);
    if (ex) ex.count++; else acc.push({ name: sp, count: 1, color: getSpeciesColor(sp) });
    return acc;
  }, [] as { name: string; count: number; color: string }[]);

  // ── Lembretes por pet ───────────────────────────────────────────────────────
  const remindersByPet = pets.map(pet => ({
    pet,
    total: reminders.filter(r => r.petId === pet.id).length,
    overdue: reminders.filter(r => {
      if (r.petId !== pet.id) return false;
      const d = parseDate(r.date); d.setHours(0, 0, 0, 0); return d < now;
    }).length,
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  // ── Score de saúde por pet ──────────────────────────────────────────────────
  const petHealthScores = pets.map(pet => {
    let score = 0;
    const petVaccines = vaccines.filter(v => v.petId === pet.id);
    const petReminders = reminders.filter(r => r.petId === pet.id);
    // tem vacina: +25
    if (petVaccines.length > 0) score += 25;
    // vacinas em dia (sem atrasadas): +25
    const hasOverdueVax = petVaccines.some(v => {
      if (!v.nextDueDate) return false;
      const d = parseDate(v.nextDueDate); d.setHours(0, 0, 0, 0); return d < now;
    });
    if (petVaccines.length > 0 && !hasOverdueVax) score += 25;
    // tem lembrete futuro: +25
    const hasFutureReminder = petReminders.some(r => {
      const d = parseDate(r.date); d.setHours(0, 0, 0, 0); return d >= now;
    });
    if (hasFutureReminder) score += 25;
    // sem lembretes atrasados: +25
    const hasOverdueRem = petReminders.some(r => {
      const d = parseDate(r.date); d.setHours(0, 0, 0, 0); return d < now;
    });
    if (petReminders.length > 0 && !hasOverdueRem) score += 25;
    else if (petReminders.length === 0) score += 25; // sem lembretes = neutro
    return { pet, score };
  });

  // ── Timeline unificada (lembretes + vacinas) ────────────────────────────────
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcomingRemindersEvents = filteredReminders
    .filter(r => { const d = parseDate(r.date); d.setHours(0,0,0,0); return d >= now && d <= in30; })
    .map(r => {
      const pet = pets.find(p => p.id === r.petId);
      return {
        id: `rem-${r.id}`,
        date: r.date,
        title: r.description || r.category,
        type: 'reminder' as const,
        petName: pet?.name || t('statistics.timeline.unknownPet'),
        color: getCategoryColor(r.category).main,
        icon: r.category === 'Saúde' ? 'medical-bag' : r.category === 'Higiene' ? 'shower' : r.category === 'Consulta' ? 'stethoscope' : 'bell',
      };
    });

  const upcomingVaccineEvents = filteredVaccines
    .filter(v => v.nextDueDate && isDateUpcoming(v.nextDueDate) && parseDate(v.nextDueDate) <= in30)
    .map(v => {
      const pet = pets.find(p => p.id === v.petId);
      return {
        id: `vac-${v.id}`,
        date: v.nextDueDate!,
        title: v.vaccineName,
        type: 'vaccine' as const,
        petName: pet?.name || t('statistics.timeline.unknownPet'),
        color: Theme.success,
        icon: 'needle',
      };
    });

  const upcomingEvents = [...upcomingRemindersEvents, ...upcomingVaccineEvents]
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
    .slice(0, 10);

  // ── Timeline histórica de vacinas ───────────────────────────────────────────
  const petsWithVaccines = pets.filter(p => vaccines.some(v => v.petId === p.id));

  const allTimeline = vaccines.map(v => {
    const pet = pets.find(p => p.id === v.petId);
    const upcoming = v.nextDueDate ? isDateUpcoming(v.nextDueDate) : false;
    return {
      id: v.id,
      petId: v.petId,
      date: v.nextDueDate || v.dateAdministered,
      title: v.vaccineName,
      type: (v.nextDueDate && upcoming) ? 'upcoming' as const : 'past' as const,
      petName: pet?.name || t('statistics.timeline.unknownPet'),
    };
  }).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  const vaccineTimeline = (selectedPetId
    ? allTimeline.filter(ev => ev.petId === selectedPetId)
    : allTimeline
  ).slice(0, 8);

  const vaccinesWithBooster = filteredVaccines.filter(v => v.nextDueDate).length;
  const vaccinesUpcoming = filteredVaccines.filter(v => v.nextDueDate && isDateUpcoming(v.nextDueDate)).length;
  const hasAnyData = pets.length > 0 || reminders.length > 0 || vaccines.length > 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <MaterialCommunityIcons name="chart-bar" size={40} color={colors.text.light} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            {t('statistics.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('statistics.title')}</Text>
          <Text style={[styles.headerSub, { color: colors.text.secondary }]}>
            {t('statistics.subtitle')}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Filtro global por pet ── */}
      {pets.length > 1 && (
        <View style={[styles.petFilterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, name: t('statistics.timeline.allPets'), species: '' }, ...pets]}
            keyExtractor={item => item.id ?? '__all__'}
            contentContainerStyle={styles.petFilterContent}
            renderItem={({ item }) => {
              const active = selectedPetId === item.id;
              const color = item.id ? getSpeciesColor(item.species) : Theme.primary;
              return (
                <TouchableOpacity
                  style={[styles.petFilterChip, { backgroundColor: active ? color : colors.card, borderColor: active ? color : colors.border }]}
                  onPress={() => setSelectedPetId(item.id)}
                  activeOpacity={0.75}
                >
                  {item.id ? (
                    <MaterialCommunityIcons name={getSpeciesIcon(item.species) as MCIName} size={14} color={active ? '#fff' : colors.text.secondary} />
                  ) : (
                    <Ionicons name="apps-outline" size={14} color={active ? '#fff' : colors.text.secondary} />
                  )}
                  <Text style={[styles.petFilterChipText, { color: active ? '#fff' : colors.text.secondary }]}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {!hasAnyData ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="chart-bar" size={48} color={colors.text.light} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('statistics.noData')}</Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {t('statistics.noDataMsg')}
            </Text>
          </View>
        ) : (
          <>
            {/* ── Alerta de atraso ── */}
            {(overdueReminders > 0 || overdueVaccines > 0) && (
              <View style={[styles.alertBanner, { backgroundColor: '#F4433610', borderColor: '#F4433640' }]}>
                <Ionicons name="alert-circle" size={20} color="#F44336" />
                <Text style={[styles.alertText, { color: '#F44336' }]}>
                  {overdueReminders > 0 && overdueVaccines > 0
                    ? t('statistics.overdueBanner', {
                        reminders: t('statistics.overdueReminders', { count: overdueReminders }),
                        vaccines: t('statistics.overdueVaccines', { count: overdueVaccines }),
                      })
                    : overdueReminders > 0
                      ? t('statistics.overdueReminders', { count: overdueReminders })
                      : t('statistics.overdueVaccines', { count: overdueVaccines })}
                </Text>
              </View>
            )}

            {/* ── Cards principais ── */}
            <View style={styles.bigCardGrid}>
              <BigStatCard value={totalPets} label={t('statistics.cards.pets')} icon="paw" color={Theme.primary} />
              <BigStatCard
                value={totalReminders} label={t('statistics.cards.reminders')} icon="bell" color="#FF9500"
                sub={overdueReminders > 0 ? t('statistics.cards.overdue', { count: overdueReminders }) : upcoming30 > 0 ? t('statistics.cards.upcoming', { count: upcoming30 }) : undefined}
                subIsAlert={overdueReminders > 0}
              />
              <BigStatCard
                value={totalVaccines} label={t('statistics.cards.vaccines')} icon="needle" color={Theme.success}
                sub={overdueVaccines > 0 ? t('statistics.cards.overdueVaccines', { count: overdueVaccines }) : vaccinesUpcoming > 0 ? t('statistics.cards.upcomingVaccines', { count: vaccinesUpcoming }) : undefined}
                subIsAlert={overdueVaccines > 0}
              />
              <BigStatCard
                value={achievementsCount} label={t('statistics.cards.achievements')} icon="trophy" color="#FF9800"
                sub={`${t('statistics.cards.of')} ${ACHIEVEMENTS.length}`}
              />
            </View>

            {/* ── Score de saúde por pet ── */}
            {!selectedPetId && petHealthScores.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <SectionHeader title={t('statistics.sections.healthScore')} icon="heart-pulse" color="#E91E63" />
                {petHealthScores.map(({ pet, score }) => {
                  const scoreColor = score >= 75 ? Theme.success : score >= 50 ? '#FF9500' : '#F44336';
                  return (
                    <TouchableOpacity
                      key={pet.id}
                      style={styles.healthScoreRow}
                      onPress={() => setSelectedPetId(pet.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.healthScoreIcon, { backgroundColor: getSpeciesColor(pet.species) + '20' }]}>
                        <MaterialCommunityIcons name={getSpeciesIcon(pet.species) as MCIName} size={18} color={getSpeciesColor(pet.species)} />
                      </View>
                      <View style={styles.healthScoreInfo}>
                        <View style={styles.healthScoreLabelRow}>
                          <Text style={[styles.healthScoreName, { color: colors.text.primary }]}>{pet.name}</Text>
                          <Text style={[styles.healthScoreVal, { color: scoreColor }]}>{score}%</Text>
                        </View>
                        <View style={[styles.healthScoreTrack, { backgroundColor: colors.border }]}>
                          <View style={[styles.healthScoreFill, { width: `${score}%` as any, backgroundColor: scoreColor }]} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Próximos eventos (lembretes + vacinas) ── */}
            {upcomingEvents.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <SectionHeader title={t('statistics.sections.upcoming')} icon="calendar-clock" color="#673AB7" />
                {upcomingEvents.map((ev, i) => (
                  <View
                    key={ev.id}
                    style={[styles.upcomingRow, i < upcomingEvents.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.upcomingIconCircle, { backgroundColor: ev.color + '18' }]}>
                      <MaterialCommunityIcons name={ev.icon as MCIName} size={16} color={ev.color} />
                    </View>
                    <View style={styles.upcomingInfo}>
                      <Text style={[styles.upcomingTitle, { color: colors.text.primary }]} numberOfLines={1}>{ev.title}</Text>
                      <View style={styles.upcomingMeta}>
                        <MaterialCommunityIcons name="paw" size={10} color={colors.text.light} />
                        <Text style={[styles.upcomingPet, { color: colors.text.secondary }]}> {ev.petName}</Text>
                      </View>
                    </View>
                    <View style={styles.upcomingDateCol}>
                      <Text style={[styles.upcomingDate, { color: ev.color }]}>{ev.date}</Text>
                      <View style={[styles.upcomingTypeBadge, { backgroundColor: ev.color + '15' }]}>
                        <Text style={[styles.upcomingTypeText, { color: ev.color }]}>
                          {ev.type === 'vaccine' ? t('statistics.sections.vaccineTag') : t('statistics.sections.reminderTag')}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── Saúde Geral ── */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <SectionHeader title={t('statistics.sections.health')} icon="shield-check" color="#F44336" />
              <HealthStatusRow label={t('statistics.health.activeReminders')} value={totalReminders - overdueReminders} max={totalReminders || 1} color={Theme.primary} icon="checkmark-circle-outline" />
              <HealthStatusRow label={t('statistics.health.vaccinesOnTime')} value={totalVaccines - overdueVaccines} max={totalVaccines || 1} color={Theme.success} icon="shield-checkmark-outline" />
              <HealthStatusRow label={t('statistics.health.achievements')} value={achievementsCount} max={ACHIEVEMENTS.length} color="#FF9800" icon="trophy-outline" />
            </View>

            {/* ── Lembretes por categoria ── */}
            {remindersByCategory.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <SectionHeader title={t('statistics.sections.byCategory')} icon="tag-multiple" color="#9C27B0" />
                {remindersByCategory.map(item => (
                  <HorizontalBar key={item.name} label={item.name} count={item.count} total={totalReminders} color={item.color} />
                ))}
              </View>
            )}

            {/* ── Lembretes por pet ── */}
            {!selectedPetId && remindersByPet.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <SectionHeader title={t('statistics.sections.byPet')} icon="paw" color="#FF6B6B" />
                {remindersByPet.map(({ pet, total, overdue }) => (
                  <TouchableOpacity key={pet.id} onPress={() => setSelectedPetId(pet.id)} activeOpacity={0.75}>
                    <HorizontalBar
                      label={pet.name}
                      count={total}
                      total={reminders.length}
                      color={overdue > 0 ? '#F44336' : getSpeciesColor(pet.species)}
                      sub={overdue > 0 ? `${overdue} atrasado${overdue > 1 ? 's' : ''}` : undefined}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Pets por espécie ── */}
            {!selectedPetId && petsBySpecies.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <SectionHeader title={t('statistics.sections.bySpecies')} icon="shape" color={Theme.primary} />
                <View style={styles.speciesGrid}>
                  {petsBySpecies.map(sp => (
                    <SpeciesChip key={sp.name} species={sp.name} count={sp.count} color={sp.color} />
                  ))}
                </View>
              </View>
            )}

            {/* ── Vacinas com reforço ── */}
            {vaccinesWithBooster > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <SectionHeader title={t('statistics.sections.boosters')} icon="needle" color={Theme.success} />
                <View style={styles.boosterRow}>
                  <View style={[styles.boosterItem, { backgroundColor: Theme.success + '12' }]}>
                    <Text style={[styles.boosterNum, { color: Theme.success }]}>{vaccinesUpcoming}</Text>
                    <Text style={[styles.boosterLabel, { color: colors.text.secondary }]}>{t('statistics.boosters.upcoming')}</Text>
                  </View>
                  <View style={[styles.boosterItem, { backgroundColor: '#FF950012' }]}>
                    <Text style={[styles.boosterNum, { color: '#FF9500' }]}>{vaccinesWithBooster - vaccinesUpcoming - overdueVaccines}</Text>
                    <Text style={[styles.boosterLabel, { color: colors.text.secondary }]}>{t('statistics.boosters.onTime')}</Text>
                  </View>
                  <View style={[styles.boosterItem, { backgroundColor: '#F4433612' }]}>
                    <Text style={[styles.boosterNum, { color: '#F44336' }]}>{overdueVaccines}</Text>
                    <Text style={[styles.boosterLabel, { color: colors.text.secondary }]}>{t('statistics.boosters.overdue')}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── Timeline histórica de vacinas ── */}
            {allTimeline.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <SectionHeader title={t('statistics.sections.timeline')} icon="clock-outline" color="#2196F3" />
                {petsWithVaccines.length > 1 && !selectedPetId && (
                  <FlatList
                    horizontal showsHorizontalScrollIndicator={false}
                    data={[{ id: null, name: t('statistics.timeline.allPets') }, ...petsWithVaccines]}
                    keyExtractor={item => item.id ?? '__all__'}
                    style={styles.petSelectorList}
                    contentContainerStyle={styles.petSelectorContent}
                    renderItem={({ item }) => {
                      const active = selectedPetId === item.id;
                      const color = item.id ? getSpeciesColor(pets.find(p => p.id === item.id)?.species ?? '') : '#2196F3';
                      return (
                        <TouchableOpacity
                          style={[styles.petChip, { backgroundColor: active ? color : colors.card, borderColor: active ? color : colors.border }]}
                          onPress={() => setSelectedPetId(item.id)}
                          activeOpacity={0.75}
                        >
                          {item.id && <MaterialCommunityIcons name={getSpeciesIcon(pets.find(p => p.id === item.id)?.species ?? '') as MCIName} size={13} color={active ? '#fff' : colors.text.secondary} />}
                          <Text style={[styles.petChipText, { color: active ? '#fff' : colors.text.secondary }]}>{item.name}</Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
                <View style={{ marginTop: 4 }}>
                  {vaccineTimeline.length > 0 ? (
                    vaccineTimeline.map((ev, i) => <TimelineCard key={ev.id} event={ev} isLast={i === vaccineTimeline.length - 1} />)
                  ) : (
                    <View style={styles.tlEmpty}>
                      <Ionicons name="calendar-outline" size={32} color={colors.text.light} />
                      <Text style={[styles.tlEmptyText, { color: colors.text.secondary }]}>{t('statistics.timeline.noVaccinesForPet')}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 16 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  scroll: { padding: 16, paddingBottom: 40 },

  // Loading / Empty
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15 },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    ...Shadows.small,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  alertIcon: { width: 24, alignItems: 'center' },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600' },

  // Big stat cards grid
  bigCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 4,
  },
  bigCard: {
    width: '46%',
    margin: '2%',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    ...Shadows.small,
  },
  bigCardIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  bigCardValue: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  bigCardLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, marginBottom: 6 },
  bigCardSub: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  bigCardSubText: { fontSize: 10, fontWeight: '700' },

  // Section card
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...Shadows.small,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderIcon: {
    width: 26, height: 26, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionHeaderText: { fontSize: 14, fontWeight: '700' },

  // Health rows
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  healthIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  healthInfo: { flex: 1 },
  healthLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  healthLabel: { fontSize: 13, fontWeight: '500' },
  healthVal: { fontSize: 13, fontWeight: '700' },
  healthTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: 3 },

  // Horizontal bars
  barRow: { marginBottom: 12 },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  barLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  barCount: { fontSize: 13, fontWeight: '700' },
  barTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barSubBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  barSubText: { fontSize: 10, fontWeight: '700' },

  // Species chips
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  speciesChipIcon: {
    width: 30, height: 30, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  speciesName: { fontSize: 13, fontWeight: '600' },
  speciesCountBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  speciesCount: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Booster stats
  boosterRow: { flexDirection: 'row', gap: 8 },
  boosterItem: {
    flex: 1, alignItems: 'center',
    borderRadius: 12, paddingVertical: 12,
  },
  boosterNum: { fontSize: 24, fontWeight: '800' },
  boosterLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Pet selector
  petSelectorList: { marginBottom: 12 },
  petSelectorContent: { gap: 8, paddingVertical: 2 },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  petChipText: { fontSize: 12, fontWeight: '600' },

  // Pet filter bar
  petFilterBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  petFilterContent: { paddingHorizontal: 16, gap: 8 },
  petFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  petFilterChipText: { fontSize: 12, fontWeight: '600' },

  // Health score per pet
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  healthScoreIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  healthScoreInfo: { flex: 1 },
  healthScoreLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  healthScoreName: { fontSize: 13, fontWeight: '600' },
  healthScoreVal: { fontSize: 13, fontWeight: '800' },
  healthScoreTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  healthScoreFill: { height: '100%', borderRadius: 4 },

  // Upcoming events
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  upcomingIconCircle: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  upcomingInfo: { flex: 1, minWidth: 0 },
  upcomingTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  upcomingMeta: { flexDirection: 'row', alignItems: 'center' },
  upcomingPet: { fontSize: 11 },
  upcomingDateCol: { alignItems: 'flex-end', gap: 4 },
  upcomingDate: { fontSize: 12, fontWeight: '700' },
  upcomingTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  upcomingTypeText: { fontSize: 10, fontWeight: '700' },

  // Timeline
  tlRow: { flexDirection: 'row' },
  tlLeft: { width: 28, alignItems: 'center', paddingTop: 14 },
  tlDot: {
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, flexShrink: 0,
  },
  tlLine: { width: 2, flex: 1, marginTop: 4 },
  tlCard: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  tlCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tlBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, gap: 4,
  },
  tlBadgeText: { fontSize: 10, fontWeight: '700' },
  tlDate: { fontSize: 11 },
  tlTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  tlPetRow: { flexDirection: 'row', alignItems: 'center' },
  tlPet: { fontSize: 11 },
  tlEmpty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  tlEmptyText: { fontSize: 13 },
});
