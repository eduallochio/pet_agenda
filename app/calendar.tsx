import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme, getCategoryColor } from '../constants/Colors';
import { Pet, Reminder, VaccineRecord } from '../types/pet';
import { useTranslation } from 'react-i18next';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EventType = 'reminder' | 'vaccine' | 'birthday';

type CalendarEvent = {
  id: string;
  day: number;
  month: number;   // 0-indexed
  year: number;    // -1 = recorrente (aniversário)
  type: EventType;
  petName: string;
  label: string;
  color: string;
  icon: string;
  petId: string;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const REMINDER_ICON: Record<string, string> = {
  Saúde: 'medical', Higiene: 'water', Consulta: 'calendar', Outro: 'ellipse-outline',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDMY(s: string): Date | null {
  const p = s.split('/');
  if (p.length !== 3) return null;
  const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return isNaN(d.getTime()) ? null : d;
}

function matchesMonth(e: CalendarEvent, month: number, year: number): boolean {
  if (e.year === -1) return e.month === month;        // aniversário — só compara mês/dia
  return e.month === month && e.year === year;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const MONTHS = t('months', { returnObjects: true, defaultValue: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ] }) as string[];

  const DAYS = t('weekDays', { returnObjects: true, defaultValue: [
    'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb',
  ] }) as string[];

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useFocusEffect(useCallback(() => { loadEvents(); }, []));

  const loadEvents = async () => {
    try {
      const [pJSON, rJSON, vJSON] = await Promise.all([
        AsyncStorage.getItem('pets'),
        AsyncStorage.getItem('reminders'),
        AsyncStorage.getItem('vaccinations'),
      ]);

      const pets: Pet[] = pJSON ? JSON.parse(pJSON) : [];
      const reminders: Reminder[] = rJSON ? JSON.parse(rJSON) : [];
      const vaccines: VaccineRecord[] = vJSON ? JSON.parse(vJSON) : [];

      const petMap: Record<string, Pet> = Object.fromEntries(pets.map(p => [p.id, p]));
      const allEvents: CalendarEvent[] = [];

      // Lembretes
      for (const r of reminders) {
        const d = parseDMY(r.date);
        if (!d) continue;
        const cat = getCategoryColor(r.category as any);
        allEvents.push({
          id: `rem-${r.id}`,
          day: d.getDate(),
          month: d.getMonth(),
          year: d.getFullYear(),
          type: 'reminder',
          petName: petMap[r.petId]?.name ?? 'Pet',
          label: r.description,
          color: cat.main,
          icon: REMINDER_ICON[r.category] ?? 'ellipse-outline',
          petId: r.petId,
        });
      }

      // Vacinas — próximo reforço
      for (const v of vaccines) {
        if (!v.nextDueDate) continue;
        const d = parseDMY(v.nextDueDate);
        if (!d) continue;
        allEvents.push({
          id: `vac-${v.id}`,
          day: d.getDate(),
          month: d.getMonth(),
          year: d.getFullYear(),
          type: 'vaccine',
          petName: petMap[v.petId]?.name ?? 'Pet',
          label: t('calendar.boosterLabel', { name: v.vaccineName }),
          color: Theme.categories.Saúde.main,
          icon: 'needle',
          petId: v.petId,
        });
      }

      // Aniversários — recorrentes (year = -1)
      for (const p of pets) {
        if (!p.dob) continue;
        const parts = p.dob.split('/');
        if (parts.length !== 3) continue;
        allEvents.push({
          id: `bday-${p.id}`,
          day: parseInt(parts[0]),
          month: parseInt(parts[1]) - 1,
          year: -1,
          type: 'birthday',
          petName: p.name,
          label: t('calendar.birthdayLabel', { name: p.name }),
          color: '#FF6B9D',
          icon: 'cake-variant',
          petId: p.id,
        });
      }

      setEvents(allEvents);
    } catch (e) {
      console.error('Erro ao carregar eventos do calendário:', e);
    }
  };

  // ── Navegação de mês ──────────────────────────────────────────────────────
  const prevMonth = () => {
    setSelectedDay(null);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    setSelectedDay(null);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // ── Grade ─────────────────────────────────────────────────────────────────
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthEvents = events.filter(e => matchesMonth(e, month, year));

  const dayEventsMap: Record<number, CalendarEvent[]> = {};
  for (const e of monthEvents) {
    if (!dayEventsMap[e.day]) dayEventsMap[e.day] = [];
    dayEventsMap[e.day].push(e);
  }

  const selectedEvents = selectedDay ? (dayEventsMap[selectedDay] ?? []) : [];
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Células: null = padding inicial
  const gridCells = [
    ...Array<null>(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Lista exibida na seção inferior
  const listEvents = selectedDay
    ? selectedEvents
    : [...monthEvents].sort((a, b) => a.day - b.day);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('calendar.title')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Navegação de mês ── */}
        <View style={[styles.monthNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text.primary }]}>
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={26} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Dias da semana ── */}
        <View style={[styles.weekHeader, { backgroundColor: colors.surface }]}>
          {DAYS.map(d => (
            <Text key={d} style={[styles.weekDay, { color: colors.text.light }]}>{d}</Text>
          ))}
        </View>

        {/* ── Grade ── */}
        <View style={[styles.grid, { backgroundColor: colors.surface }]}>
          {gridCells.map((day, idx) => {
            if (day === null) return <View key={`e-${idx}`} style={styles.cell} />;

            const dayEvts = dayEventsMap[day] ?? [];
            const isSelected = day === selectedDay;
            const isTod = isToday(day);

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.cell,
                  isSelected && { backgroundColor: colors.primary },
                  !isSelected && isTod && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setSelectedDay(isSelected ? null : day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.cellDay,
                  { color: isSelected ? '#fff' : isTod ? colors.primary : colors.text.primary },
                  (isSelected || isTod) && { fontWeight: '800' },
                ]}>
                  {day}
                </Text>
                {dayEvts.length > 0 && (
                  <View style={styles.dotsRow}>
                    {dayEvts.slice(0, 3).map((e, i) => (
                      <View key={i} style={[styles.dot, { backgroundColor: isSelected ? '#fff' : e.color }]} />
                    ))}
                    {dayEvts.length > 3 && (
                      <Text style={[styles.dotMore, { color: isSelected ? '#fff' : colors.text.light }]}>+</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Legenda ── */}
        <View style={[styles.legend, { borderTopColor: colors.border }]}>
          {[
            { color: Theme.categories.Saúde.main, label: t('calendar.legend.health') },
            { color: Theme.categories.Higiene.main, label: t('calendar.legend.hygiene') },
            { color: Theme.categories.Consulta.main, label: t('calendar.legend.appointment') },
            { color: Theme.categories.Saúde.main, label: t('calendar.legend.vaccine') },
            { color: '#FF6B9D', label: t('calendar.legend.birthday') },
          ].map(item => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendLabel, { color: colors.text.secondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Lista de eventos ── */}
        <View style={styles.eventsSection}>
          <Text style={[styles.eventsSectionTitle, { color: colors.text.primary }]}>
            {selectedDay
              ? t('calendar.selectedDay', { day: selectedDay, month: MONTHS[month] })
              : t('calendar.eventsOfMonth', { month: MONTHS[month] })}
          </Text>

          {listEvents.length === 0 ? (
            <View style={[styles.emptyDay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons
                name={selectedDay ? 'calendar-check-outline' : 'calendar-blank-outline'}
                size={32}
                color={colors.text.light}
              />
              <Text style={[styles.emptyDayText, { color: colors.text.light }]}>
                {selectedDay ? t('calendar.noEventDay') : t('calendar.noEventMonth')}
              </Text>
            </View>
          ) : (
            listEvents.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.eventCard, {
                  backgroundColor: colors.surface,
                  borderLeftColor: item.color,
                  ...(Platform.OS === 'web'
                    ? { boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }
                    : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 }),
                }]}
                onPress={() => {
                  if (!selectedDay) {
                    setSelectedDay(item.day);
                  } else if (item.type !== 'birthday') {
                    router.push(`/pet/${item.petId}` as any);
                  }
                }}
                activeOpacity={item.type === 'birthday' && !!selectedDay ? 1 : 0.75}
              >
                {/* Badge do dia — só na lista do mês inteiro */}
                {!selectedDay && (
                  <View style={[styles.eventDayBadge, { backgroundColor: item.color }]}>
                    <Text style={styles.eventDayNum}>{item.day}</Text>
                  </View>
                )}

                <View style={[styles.eventIconCircle, { backgroundColor: item.color + '20' }]}>
                  {item.type === 'vaccine' ? (
                    <MaterialCommunityIcons name="needle" size={18} color={item.color} />
                  ) : item.type === 'birthday' ? (
                    <MaterialCommunityIcons name="cake-variant" size={18} color={item.color} />
                  ) : (
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  )}
                </View>

                <View style={styles.eventInfo}>
                  <Text style={[styles.eventLabel, { color: colors.text.primary }]}>{item.label}</Text>
                  <Text style={[styles.eventPet, { color: colors.text.secondary }]}>{item.petName}</Text>
                </View>

                {item.type !== 'birthday' && !!selectedDay && (
                  <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1,
  },
  monthTitle: { fontSize: 20, fontWeight: '800' },

  weekHeader: {
    flexDirection: 'row', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4,
  },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 8, paddingBottom: 12,
  },
  cell: {
    // 1/7 da largura — percentual funciona no RN como string
    width: '14.28%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 2,
  },
  cellDay: { fontSize: 14, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 1.5 },
  dotMore: { fontSize: 9, fontWeight: '700', marginLeft: 1 },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendLabel: { fontSize: 11 },

  eventsSection: { paddingHorizontal: 16, paddingTop: 16 },
  eventsSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  emptyDay: {
    alignItems: 'center', justifyContent: 'center',
    padding: 24, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
  },
  emptyDayText: { fontSize: 14, marginTop: 8 },

  eventCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
  },
  eventDayBadge: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  eventDayNum: { color: '#fff', fontSize: 13, fontWeight: '800' },
  eventIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  eventInfo: { flex: 1 },
  eventLabel: { fontSize: 14, fontWeight: '600' },
  eventPet: { fontSize: 12, marginTop: 2 },
});
