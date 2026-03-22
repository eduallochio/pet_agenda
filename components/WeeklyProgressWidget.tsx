import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Reminder } from '../types/pet';

type Props = { reminders: Reminder[] };

function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function parseDate(s: string): Date {
  const p = s.split('/');
  if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(s);
}

export default function WeeklyProgressWidget({ reminders }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const animWidth = useRef(new Animated.Value(0)).current;

  const { start, end } = getWeekBounds();
  const weekReminders = reminders.filter(r => {
    const d = parseDate(r.date);
    return d >= start && d <= end;
  });
  const total = weekReminders.length;
  const done = weekReminders.filter(r => r.completed).length;
  const pct = total === 0 ? 0 : done / total;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: pct,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  if (total === 0) return null;

  const emoji = pct === 1 ? '🎉' : pct >= 0.5 ? '💪' : '📋';
  const barColor = pct === 1 ? '#4CAF50' : pct >= 0.5 ? Theme.primary : '#FF9800';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text.primary }]}>{t('weeklyProgress.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {pct === 1
              ? t('weeklyProgress.allDone')
              : t('weeklyProgress.completed', { done, total })}
          </Text>
        </View>
        <Text style={[styles.pctText, { color: barColor }]}>
          {Math.round(pct * 100)}%
        </Text>
      </View>
      <View style={[styles.barBg, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  emoji: { fontSize: 22 },
  headerText: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  pctText: { fontSize: 18, fontWeight: '800' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
});
