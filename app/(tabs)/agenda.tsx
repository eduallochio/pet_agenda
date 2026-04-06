import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryColor, Theme } from '../../constants/Colors';
import { Pet, Reminder, VaccineRecord } from '../../types/pet';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EventType = 'reminder' | 'vaccine' | 'birthday';

type CalendarEvent = {
  id: string;
  day: number;
  month: number;
  year: number;
  type: EventType;
  petName: string;
  label: string;
  color: string;
  icon: string;
  petId: string;
};

const REMINDER_ICON: Record<string, string> = {
  Saúde: 'medical', Higiene: 'water', Consulta: 'calendar', Outro: 'ellipse-outline',
};

function parseDMY(s: string): Date | null {
  const p = s.split('/');
  if (p.length !== 3) return null;
  const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return isNaN(d.getTime()) ? null : d;
}

function matchesMonth(e: CalendarEvent, month: number, year: number): boolean {
  if (e.year === -1) return e.month === month;
  return e.month === month && e.year === year;
}

export default function AgendaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

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

      for (const r of reminders) {
        const d = parseDMY(r.date);
        if (!d) continue;
        const cat = getCategoryColor(r.category as any);
        allEvents.push({
          id: `rem-${r.id}`,
          day: d.getDate(), month: d.getMonth(), year: d.getFullYear(),
          type: 'reminder',
          petName: petMap[r.petId]?.name ?? 'Pet',
          label: r.description,
          color: cat.main,
          icon: REMINDER_ICON[r.category] ?? 'ellipse-outline',
          petId: r.petId,
        });
      }

      for (const v of vaccines) {
        if (!v.nextDueDate) continue;
        const d = parseDMY(v.nextDueDate);
        if (!d) continue;
        allEvents.push({
          id: `vac-${v.id}`,
          day: d.getDate(), month: d.getMonth(), year: d.getFullYear(),
          type: 'vaccine',
          petName: petMap[v.petId]?.name ?? 'Pet',
          label: t('calendar.boosterLabel', { name: v.vaccineName }),
          color: Theme.categories.Saúde.main,
          icon: 'needle',
          petId: v.petId,
        });
      }

      for (const p of pets) {
        if (!p.dob) continue;
        const parts = p.dob.split('/');
        if (parts.length !== 3) continue;
        allEvents.push({
          id: `bday-${p.id}`,
          day: parseInt(parts[0]), month: parseInt(parts[1]) - 1, year: -1,
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

  const gridCells = [
    ...Array<null>(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const listEvents = selectedDay
    ? selectedEvents
    : [...monthEvents].sort((a, b) => a.day - b.day);

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {t('calendar.title', { defaultValue: 'Agenda' })}
        </Text>
        <TouchableOpacity
          style={styles.todayBtn}
          onPress={() => {
            setYear(today.getFullYear());
            setMonth(today.getMonth());
            setSelectedDay(today.getDate());
          }}
        >
          <Text style={styles.todayBtnText}>{t('calendar.today', { defaultValue: 'Hoje' })}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Navegação de mês */}
        <View style={[styles.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text.primary }]}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Dias da semana */}
        <View style={styles.weekHeader}>
          {DAYS.map(d => (
            <Text key={d} style={[styles.weekDay, { color: colors.text.light }]}>{d}</Text>
          ))}
        </View>

        {/* Grade */}
        <View style={styles.grid}>
          {gridCells.map((day, idx) => {
            if (day === null) return <View key={`e-${idx}`} style={styles.cell} />;
            const dayEvts = dayEventsMap[day] ?? [];
            const isSelected = day === selectedDay;
            const isTod = isToday(day);
            const isSunday = (firstDayOfMonth + day - 1) % 7 === 0;
            const isSaturday = (firstDayOfMonth + day - 1) % 7 === 6;
            const isWeekend = isSunday || isSaturday;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.cell,
                  isSelected && { backgroundColor: Theme.primary },
                  !isSelected && isTod && { backgroundColor: Theme.primary + '20' },
                ]}
                onPress={() => setSelectedDay(isSelected ? null : day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.cellDay,
                  { color: isSelected ? '#FFFFFF' : isWeekend ? colors.text.light : colors.text.primary },
                  isSelected && { fontWeight: '700' },
                ]}>
                  {day}
                </Text>
                {dayEvts.length > 0 && !isSelected && (
                  <View style={styles.dotsRow}>
                    {dayEvts.slice(0, 3).map((e, i) => (
                      <View key={i} style={[styles.dot, { backgroundColor: e.color }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista de eventos */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={[styles.eventsSectionTitle, { color: colors.text.primary }]}>
              {selectedDay
                ? t('calendar.selectedDay', { day: selectedDay, month: MONTHS[month] })
                : t('calendar.eventsOfMonth', { month: MONTHS[month] })}
            </Text>
            {listEvents.length > 0 && (
              <Text style={[styles.eventsSectionCount, { color: colors.text.secondary }]}>
                {listEvents.length} {t('calendar.events', { defaultValue: 'eventos' })}
              </Text>
            )}
          </View>

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
                style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  if (!selectedDay) {
                    setSelectedDay(item.day);
                  } else if (item.type !== 'birthday') {
                    router.push(`/pet/${item.petId}` as any);
                  }
                }}
                activeOpacity={item.type === 'birthday' && !!selectedDay ? 1 : 0.75}
              >
                <View style={[styles.eventBar, { backgroundColor: item.color }]} />
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventLabel, { color: colors.text.primary }]}>{item.label}</Text>
                  <Text style={[styles.eventSub, { color: colors.text.secondary }]}>{item.petName}</Text>
                </View>
                {item.type === 'vaccine' ? (
                  <MaterialCommunityIcons name="needle" size={18} color={item.color} />
                ) : item.type === 'birthday' ? (
                  <MaterialCommunityIcons name="cake-variant" size={18} color={item.color} />
                ) : (
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  todayBtn: {
    backgroundColor: Theme.primary,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  todayBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16,
  },
  monthTitle: { fontSize: 16, fontWeight: '600' },

  weekHeader: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '500' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 8 },
  cell: {
    width: '14.28%', height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, marginBottom: 6,
  },
  cellDay: { fontSize: 13, fontWeight: '400' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 1 },

  eventsSection: { paddingTop: 16 },
  eventsSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  eventsSectionTitle: { fontSize: 16, fontWeight: '600' },
  eventsSectionCount: { fontSize: 12 },

  emptyDay: {
    alignItems: 'center', justifyContent: 'center',
    padding: 24, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
  },
  emptyDayText: { fontSize: 14, marginTop: 8 },

  eventCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, gap: 12,
  },
  eventBar: { width: 4, height: 40, borderRadius: 2 },
  eventInfo: { flex: 1 },
  eventLabel: { fontSize: 14, fontWeight: '600' },
  eventSub: { fontSize: 11, marginTop: 2 },
});
