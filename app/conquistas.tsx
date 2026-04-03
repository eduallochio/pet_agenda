import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useGoBack } from '../hooks/useGoBack';
import {
  ACHIEVEMENTS,
  getAchievementProgress,
  AchievementProgress,
} from '../hooks/useAchievements';
import { Achievement } from '../types/pet';
import { Theme } from '../constants/Colors';

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

const XP_PER_ACHIEVEMENT = 100;

function getLevel(xp: number): { level: number; title: string; xpInLevel: number; xpToNext: number } {
  const thresholds = [0, 500, 1000, 2000, 3500, 5000, 7000, 9500, 12500, 16000];
  const titles = [
    'Iniciante', 'Curioso', 'Aprendiz', 'Cuidador', 'Dedicado',
    'Pet Lover', 'Expert', 'Mestre', 'Lenda', 'Pet Master',
  ];
  let level = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) { level = i; break; }
  }
  const xpInLevel = xp - thresholds[level];
  const xpToNext = level < thresholds.length - 1 ? thresholds[level + 1] - thresholds[level] : 1;
  return { level: level + 1, title: titles[level], xpInLevel, xpToNext };
}

export default function ConquistasScreen() {
  const goBack = useGoBack('/');
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<string, AchievementProgress>>({});

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          const [achJSON, streakJSON, petsJSON, remJSON, vacJSON, weightJSON] = await Promise.all([
            AsyncStorage.getItem('achievements'),
            AsyncStorage.getItem('streakData'),
            AsyncStorage.getItem('pets'),
            AsyncStorage.getItem('reminders'),
            AsyncStorage.getItem('vaccinations'),
            AsyncStorage.getItem('weightRecords'),
          ]);

          const unlocked: Achievement[] = achJSON ? JSON.parse(achJSON) : [];
          setUnlockedAchievements(unlocked);

          const streakData = streakJSON ? JSON.parse(streakJSON) : { currentStreak: 0 };
          setStreak(streakData.currentStreak ?? 0);

          const unlockedIds = unlocked.map((a: Achievement) => a.id);
          const progressData = {
            pets: petsJSON ? JSON.parse(petsJSON) : [],
            reminders: remJSON ? JSON.parse(remJSON) : [],
            vaccines: vacJSON ? JSON.parse(vacJSON) : [],
            weightRecords: weightJSON ? JSON.parse(weightJSON) : [],
            streak: streakData,
            unlocked: unlockedIds,
          };

          const map: Record<string, AchievementProgress> = {};
          for (const ach of ACHIEVEMENTS) {
            if (!unlockedIds.includes(ach.id)) {
              map[ach.id] = getAchievementProgress(ach.id, progressData);
            }
          }
          setProgressMap(map);
        } catch (e) {
          console.error('Erro ao carregar conquistas:', e);
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [])
  );

  const unlockedIds = unlockedAchievements.length > 0
    ? unlockedAchievements.map(a => a.id)
    : [];
  const xp = unlockedAchievements.length * XP_PER_ACHIEVEMENT;
  const levelInfo = getLevel(xp);
  const xpPct = Math.min(100, Math.round((levelInfo.xpInLevel / levelInfo.xpToNext) * 100));
  const xpRemaining = Math.max(0, levelInfo.xpToNext - levelInfo.xpInLevel);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Theme.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Conquistas</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Level Card */}
        <View style={[styles.levelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.trophyCircle}>
            <MaterialCommunityIcons name="trophy" size={32} color="#FFB74D" />
          </View>
          <Text style={[styles.levelTitle, { color: colors.text.primary }]}>
            Nível {levelInfo.level} - {levelInfo.title}
          </Text>
          <Text style={[styles.xpText, { color: colors.text.secondary }]}>
            {levelInfo.xpInLevel.toLocaleString('pt-BR')} / {levelInfo.xpToNext.toLocaleString('pt-BR')} XP
          </Text>
          <View style={[styles.xpTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.xpFill, { width: `${xpPct}%` as any }]} />
          </View>
          <View style={styles.xpRow}>
            <Text style={[styles.xpHint, { color: colors.text.light }]}>
              {xpRemaining.toLocaleString('pt-BR')} XP para o próximo nível
            </Text>
          </View>
        </View>

        {/* Stats — 3 cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: Theme.primary }]}>{unlockedAchievements.length}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Conquistas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#FFB74D' }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Dias seguidos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#9C27B0' }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Desafios</Text>
          </View>
        </View>

        {/* Todas as Conquistas */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Todas as Conquistas</Text>

        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlockedIds.includes(ach.id);
          const prog = progressMap[ach.id];

          return (
            <View
              key={ach.id}
              style={[
                styles.achCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                !isUnlocked && styles.achCardLocked,
              ]}
            >
              <View style={[
                styles.achIconCircle,
                { backgroundColor: isUnlocked ? ach.color + '22' : colors.border },
              ]}>
                <MaterialCommunityIcons
                  name={ach.icon as MCIName}
                  size={22}
                  color={isUnlocked ? ach.color : colors.text.light}
                />
              </View>

              <View style={styles.achInfo}>
                <Text style={[styles.achTitle, { color: isUnlocked ? colors.text.primary : colors.text.secondary }]}>
                  {ach.title}
                </Text>
                <Text style={[styles.achDesc, { color: colors.text.light }]}>{ach.description}</Text>
              </View>

              {isUnlocked ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              ) : prog && prog.target > 0 ? (
                <Text style={[styles.progressText, { color: colors.text.light }]}>
                  {prog.current}/{prog.target}
                </Text>
              ) : null}
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'left', marginLeft: 4 },

  // Level card
  levelCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
    gap: 14,
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFB74D22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTitle: { fontSize: 18, fontWeight: '700' },
  xpText: { fontSize: 13 },
  xpTrack: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4, backgroundColor: Theme.primary },
  xpRow: { width: '100%' },
  xpHint: { fontSize: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', paddingVertical: 12, gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11 },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },

  // Achievement cards
  achCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 12,
  },
  achCardLocked: { opacity: 0.5 },
  achIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  achInfo: { flex: 1, gap: 2 },
  achTitle: { fontSize: 14, fontWeight: '600' },
  achDesc: { fontSize: 12 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  progressText: { fontSize: 11, fontWeight: '600' },
});
