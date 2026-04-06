import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pet, Reminder, VaccineRecord } from '../../types/pet';
import { Theme, getCategoryColor } from '../../constants/Colors';
import { useTheme } from '../../hooks/useTheme';
import { getUnlockedAchievements } from '../../hooks/useAchievements';
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

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function BigStatCard({
  value, label, icon, color,
}: {
  value: number; label: string; icon: string; color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bigCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <MaterialCommunityIcons name={icon as MCIName} size={20} color={color} />
      <Text style={[styles.bigCardValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.bigCardLabel, { color: colors.text.secondary }]}>{label}</Text>
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
      <Text style={[styles.barLabel, { color: colors.text.secondary }]}>{label}</Text>
      <View style={[styles.barTrack, { backgroundColor: '#F0F0F0' }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barCount, { color: colors.text.primary }]}>{count}</Text>
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

  const remindersByCategory = [
    { name: 'Saúde',    count: filteredReminders.filter(r => r.category === 'Saúde').length,    color: getCategoryColor('Saúde').main },
    { name: 'Higiene',  count: filteredReminders.filter(r => r.category === 'Higiene').length,  color: getCategoryColor('Higiene').main },
    { name: 'Consulta', count: filteredReminders.filter(r => r.category === 'Consulta').length, color: getCategoryColor('Consulta').main },
    { name: 'Outro',    count: filteredReminders.filter(r => r.category === 'Outro').length,    color: getCategoryColor('Outro').main },
  ].filter(c => c.count > 0);


  const vaccinesUpcoming = filteredVaccines.filter(v => v.nextDueDate && isDateUpcoming(v.nextDueDate)).length;
  const hasAnyData = pets.length > 0 || reminders.length > 0 || vaccines.length > 0;

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
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
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            {t('statistics.title', { defaultValue: 'Estatísticas' })}
          </Text>
          {pets.length > 1 && (
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() => setSelectedPetId(selectedPetId ? null : pets[0]?.id ?? null)}
              activeOpacity={0.75}
            >
              <Ionicons name="options-outline" size={14} color="#666666" />
              <Text style={styles.filterPillText}>
                {selectedPetId
                  ? pets.find(p => p.id === selectedPetId)?.name ?? t('statistics.timeline.allPets')
                  : t('statistics.allPets', { defaultValue: 'Todos os pets' })}
              </Text>
            </TouchableOpacity>
          )}
        </View>

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
              <View style={styles.alertBanner}>
                <Ionicons name="warning-outline" size={18} color="#FF9800" />
                <Text style={styles.alertText}>
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
              <BigStatCard value={totalReminders} label={t('statistics.cards.reminders')} icon="bell" color="#FF9800" />
              <BigStatCard value={totalVaccines} label={t('statistics.cards.vaccines')} icon="needle" color={Theme.success} />
              <BigStatCard value={achievementsCount} label={t('statistics.cards.achievements')} icon="trophy" color="#9C27B0" />
            </View>

            {/* ── Lembretes por categoria ── */}
            {remindersByCategory.length > 0 && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  {t('statistics.sections.byCategory', { defaultValue: 'Lembretes por Categoria' })}
                </Text>
                <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {remindersByCategory.map(item => (
                    <HorizontalBar key={item.name} label={item.name} count={item.count} total={totalReminders} color={item.color} />
                  ))}
                </View>
              </View>
            )}

            {/* ── Status das Vacinas ── */}
            {(totalVaccines > 0 || overdueVaccines > 0) && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  {t('statistics.sections.boosters')}
                </Text>
                <View style={styles.boosterRow}>
                  <View style={[styles.boosterItem, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.boosterNum, { color: '#4CAF50' }]}>
                      {Math.max(0, totalVaccines - overdueVaccines - vaccinesUpcoming)}
                    </Text>
                    <Text style={[styles.boosterLabel, { color: '#388E3C' }]}>
                      {t('statistics.boosters.onTime')}
                    </Text>
                  </View>
                  <View style={[styles.boosterItem, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={[styles.boosterNum, { color: '#FF9800' }]}>{vaccinesUpcoming}</Text>
                    <Text style={[styles.boosterLabel, { color: '#E65100' }]}>
                      {t('statistics.boosters.upcoming')}
                    </Text>
                  </View>
                  <View style={[styles.boosterItem, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={[styles.boosterNum, { color: '#F44336' }]}>{overdueVaccines}</Text>
                    <Text style={[styles.boosterLabel, { color: '#C62828' }]}>
                      {t('statistics.boosters.overdue')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  filterPillText: { fontSize: 12, color: '#666666' },

  // Loading / Empty
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15 },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    backgroundColor: '#FFF3E0',
  },
  alertText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#E65100' },

  // Big stat cards grid - 4 in a row
  bigCardGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  bigCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  bigCardValue: { fontSize: 24, fontWeight: '700' },
  bigCardLabel: { fontSize: 11 },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },

  // Chart card with border
  chartCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },

  // Horizontal bars
  barRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 12,
  },
  barLabel: { width: 55, fontSize: 11, color: '#666666' },
  barCount: { fontSize: 12, fontWeight: '600', minWidth: 20, textAlign: 'right' as const },
  barTrack: { flex: 1, height: 22, borderRadius: 6, overflow: 'hidden', backgroundColor: '#F0F0F0' },
  barFill: { height: '100%', borderRadius: 6 },

  // Vaccine status cards
  boosterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  boosterItem: {
    flex: 1, alignItems: 'center',
    borderRadius: 14, paddingVertical: 14, gap: 6,
  },
  boosterNum: { fontSize: 22, fontWeight: '700' },
  boosterLabel: { fontSize: 11 },
});
