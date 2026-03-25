import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState, useMemo, useRef } from 'react';
import {
  Alert, FlatList, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '../../constants/Shadows';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Pet, Reminder, VaccineRecord } from '../../types/pet';
import { Theme } from '../../constants/Colors';
import Badge from '../../components/Badge';
import PetAvatar from '../../components/PetAvatar';
import FadeIn from '../../components/animations/FadeIn';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import SearchBar from '../../components/SearchBar';
import BirthdayBanner from '../../components/BirthdayBanner';
import AdBanner from '../../components/AdBanner';
import TodayWidget from '../../components/TodayWidget';
import BirthdayModal from '../../components/BirthdayModal';
import StreakBadge from '../../components/StreakBadge';
import { AppBottomSheetModal } from '../../components/AppBottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { tickStreak, StreakData } from '../../hooks/useStreak';
import { getCurrentChallenge, loadChallengeState, getWeekKey } from '../../hooks/useChallenges';
import ChallengeCard from '../../components/ChallengeCard';
import UpcomingVaccinesCard from '../../components/UpcomingVaccinesCard';
import { useTranslation } from 'react-i18next';

// Calcula idade a partir de DD/MM/YYYY — retorna número de meses e anos para uso com t()
function calcAgeRaw(dob: string): { type: 'newborn' | 'months' | 'years'; count: number } | null {
  if (!dob) return null;
  const parts = dob.split('/');
  if (parts.length !== 3) return null;
  const birth = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (months < 1) return { type: 'newborn', count: 0 };
  if (months < 12) return { type: 'months', count: months };
  return { type: 'years', count: Math.floor(months / 12) };
}

// Calcula dias até o próximo aniversário — retorna 0 se hoje, null se sem dob
function calcBirthdayCountdown(dob: string): number | null {
  if (!dob) return null;
  const parts = dob.split('/');
  if (parts.length !== 3) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  let next = new Date(now.getFullYear(), month, day);
  next.setHours(0, 0, 0, 0);
  if (next < now) next = new Date(now.getFullYear() + 1, month, day);
  return Math.round((next.getTime() - now.getTime()) / 86400000);
}

const SWIPE_THRESHOLD = 80;
const DELETE_WIDTH = 80;

// ─── Health Score ─────────────────────────────────────────────────────────────
function calcHealthScore(
  overdueReminders: number,
  overdueVaccines: number,
  upcomingCount: number,
  hasVaccines: boolean,
): { score: number; color: string; label: string } {
  let score = 100;
  score -= Math.min(overdueReminders, 2) * 20;
  score -= Math.min(overdueVaccines, 2) * 25;
  if (upcomingCount > 0) score = Math.min(100, score + 5);
  if (hasVaccines) score = Math.min(100, score + 5);
  score = Math.max(0, score);
  if (score >= 80) return { score, color: '#4CAF50', label: '●' };
  if (score >= 50) return { score, color: '#FF9800', label: '●' };
  return { score, color: '#F44336', label: '●' };
}

// ─── Card com swipe reanimated ────────────────────────────────────────────────
function SwipePetCard({
  pet,
  index,
  upcomingCount,
  overdueReminders,
  todayReminders,
  overdueVaccines,
  healthScore,
  birthdayCountdown,
  onPress,
  onDelete,
}: {
  pet: Pet;
  index: number;
  upcomingCount: number;
  overdueReminders: number;
  todayReminders: number;
  overdueVaccines: number;
  healthScore: { score: number; color: string; label: string };
  birthdayCountdown: number | null;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const deleteOpacity = useSharedValue(0);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const triggerDelete = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -DELETE_WIDTH - 10);
        deleteOpacity.value = interpolate(
          -e.translationX,
          [0, DELETE_WIDTH],
          [0, 1],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-DELETE_WIDTH);
        deleteOpacity.value = withTiming(1);
        runOnJS(triggerHaptic)();
      } else {
        translateX.value = withSpring(0);
        deleteOpacity.value = withTiming(0);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (translateX.value < -10) {
      translateX.value = withSpring(0);
      deleteOpacity.value = withTiming(0);
    } else {
      runOnJS(onPress)();
    }
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: deleteOpacity.value,
  }));

  const ageRaw = calcAgeRaw(pet.dob);
  const age = ageRaw
    ? ageRaw.type === 'newborn'
      ? t('age.newborn')
      : ageRaw.type === 'months'
        ? t('age.months', { count: ageRaw.count })
        : t('age.years', { count: ageRaw.count })
    : '';

  return (
    <FadeIn delay={index * 60}>
      <View style={styles.swipeContainer}>
        {/* Fundo vermelho */}
        <Animated.View style={[styles.deleteBackground, deleteStyle]}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              translateX.value = withSpring(0);
              deleteOpacity.value = withTiming(0);
              triggerDelete();
            }}
          >
            <Ionicons name="trash" size={22} color="#fff" />
            <Text style={styles.deleteBackgroundText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Card deslizável */}
        <GestureDetector gesture={Gesture.Race(panGesture, tapGesture)}>
          <Animated.View
            style={[
              styles.petCard,
              { backgroundColor: colors.surface },
              cardStyle,
            ]}
          >
            <PetAvatar species={pet.species} photoUri={pet.photoUri} size="medium" />

            <View style={styles.petInfo}>
              <Text style={[styles.petName, { color: colors.text.primary }]}>{pet.name}</Text>
              <Text style={[styles.petMeta, { color: colors.text.secondary }]}>
                {[pet.species, pet.breed].filter(Boolean).join(' · ')}
              </Text>
              {!!age && (
                <Text style={[styles.petAge, { color: colors.text.light }]}>{age}</Text>
              )}
              <View style={styles.badgesRow}>
                {overdueReminders > 0 && (
                  <Badge variant="danger" label={t('home.overdue', { count: overdueReminders })} small style={styles.badge} />
                )}
                {todayReminders > 0 && (
                  <Badge variant="warning" label={t('home.today', { count: todayReminders })} small style={styles.badge} />
                )}
                {overdueVaccines > 0 && (
                  <Badge variant="danger" label={t('home.overdueVaccine', { count: overdueVaccines })} small style={styles.badge} />
                )}
                {upcomingCount > 0 && overdueReminders === 0 && todayReminders === 0 && (
                  <Badge variant="info" label={t('common.events') + `: ${upcomingCount}`} small style={styles.badge} />
                )}
              </View>
              <View style={styles.healthRow}>
                <Text style={[styles.healthDot, { color: healthScore.color }]}>●</Text>
                <Text style={[styles.healthLabel, { color: healthScore.color }]}>{healthScore.score}</Text>
                {birthdayCountdown !== null && birthdayCountdown <= 7 && (
                  <View style={styles.birthdayChip}>
                    <Text style={styles.birthdayChipText}>
                      {birthdayCountdown === 0 ? '🎂' : `🎂 ${birthdayCountdown}d`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
          </Animated.View>
        </GestureDetector>
      </View>
    </FadeIn>
  );
}

// ─── Chip de opção no BottomSheet ─────────────────────────────────────────────
function OptionChip({
  label, active, onPress, color,
}: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const { colors } = useTheme();
  const accentColor = color ?? Theme.primary;
  return (
    <TouchableOpacity
      style={[
        styles.optionChip,
        { backgroundColor: active ? accentColor : colors.card, borderColor: active ? accentColor : colors.border },
      ]}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onPress();
      }}
    >
      <Text style={[styles.optionChipText, { color: active ? '#fff' : colors.text.secondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function PetDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'species' | 'events'>('name');
  const [birthdayPet, setBirthdayPet] = useState<{ name: string; age: number; species: string } | null>(null);
  const [birthdayModal, setBirthdayModal] = useState<{ name: string; age: number; species: string } | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const streakInitialized = useRef(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [challengeDaysLeft, setChallengeDaysLeft] = useState(7);
  const [fabOpen, setFabOpen] = useState(false);
  const fabRotation = useSharedValue(0);
  const miniFabScale = useSharedValue(0);

  // Ref do bottom sheet de filtros
  const filterSheetRef = useRef<BottomSheetModal>(null);

  // FAB expandível
  const fabOpenRef = useRef(false);
  const toggleFab = () => {
    const next = !fabOpenRef.current;
    fabOpenRef.current = next;
    setFabOpen(next);
    fabRotation.value = withSpring(next ? 1 : 0, { damping: 12 });
    miniFabScale.value = withSpring(next ? 1 : 0, { damping: 14 });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(fabRotation.value, [0, 1], [0, 45])}deg` }],
  }));

  const miniFab1Style = useAnimatedStyle(() => ({
    transform: [{ scale: miniFabScale.value }, { translateY: interpolate(miniFabScale.value, [0, 1], [0, -70]) }],
    opacity: miniFabScale.value,
  }));

  const miniFab2Style = useAnimatedStyle(() => ({
    transform: [{ scale: miniFabScale.value }, { translateY: interpolate(miniFabScale.value, [0, 1], [0, -130]) }],
    opacity: miniFabScale.value,
  }));

  const handleReminderFab = () => {
    toggleFab();
    if (pets.length === 0) return;
    if (pets.length === 1) {
      router.push({ pathname: '/reminder/new', params: { petId: pets[0].id } });
    } else {
      Alert.alert(
        t('common.selectPet'),
        undefined,
        pets.map(p => ({ text: p.name, onPress: () => router.push({ pathname: '/reminder/new', params: { petId: p.id } }) })).concat([{ text: t('common.cancel'), style: 'cancel' as const, onPress: () => {} }])
      );
    }
  };

  const activeFiltersCount = (selectedSpecies.length > 0 ? 1 : 0) + (sortBy !== 'name' ? 1 : 0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [petsJSON, remindersJSON, vaccinesJSON] = await Promise.all([
        AsyncStorage.getItem('pets'),
        AsyncStorage.getItem('reminders'),
        AsyncStorage.getItem('vaccinations'),
      ]);

      // Desafio semanal
      const { completed } = await loadChallengeState();
      setChallengeCompleted(completed);
      const weekKey = getWeekKey();
      const weekNum = parseInt(weekKey.split('-W')[1]);
      const year = parseInt(weekKey.split('-W')[0]);
      // Calcula dia que a semana começa (segunda) e termina (domingo)
      const jan1 = new Date(year, 0, 1);
      const weekStart = new Date(jan1.getTime() + (weekNum - 1) * 7 * 86400000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
      const now = new Date();
      const msLeft = weekEnd.getTime() - now.getTime();
      setChallengeDaysLeft(Math.max(1, Math.ceil(msLeft / 86400000)));
      const loadedPets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
      setPets(loadedPets);
      setReminders(remindersJSON ? JSON.parse(remindersJSON) : []);
      setVaccines(vaccinesJSON ? JSON.parse(vaccinesJSON) : []);

      const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      const shownDate = await AsyncStorage.getItem('birthdayShownDate');
      for (const p of loadedPets) {
        if (!p.dob) continue;
        const parts = p.dob.split('/');
        if (parts.length !== 3) continue;
        const day = parseInt(parts[0]);
        const mon = parseInt(parts[1]) - 1;
        if (day === now.getDate() && mon === now.getMonth()) {
          const age = now.getFullYear() - parseInt(parts[2]);
          setBirthdayPet({ name: p.name, age, species: p.species });
          if (shownDate !== todayStr) {
            setBirthdayModal({ name: p.name, age, species: p.species });
            await AsyncStorage.setItem('birthdayShownDate', todayStr);
          }
          break;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadData();
    if (!streakInitialized.current) {
      streakInitialized.current = true;
      tickStreak().then(setStreak);
    }
  }, []));

  const handleDeletePet = async (petId: string) => {
    try {
      const updated = pets.filter(p => p.id !== petId);
      await AsyncStorage.setItem('pets', JSON.stringify(updated));
      setPets(updated);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(t('common.error'), t('home.deleteError'));
    }
  };

  const confirmDelete = (pet: Pet) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('home.deleteConfirmTitle'),
      t('home.deleteConfirmMsg', { name: pet.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDeletePet(pet.id) },
      ]
    );
  };

  const getPetStats = (petId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parseDate = (s: string) => {
      const p = s.split('/');
      if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      return new Date(s);
    };
    const petReminders = reminders.filter(r => r.petId === petId && !r.completed);
    const overdueReminders = petReminders.filter(r => { const d = parseDate(r.date); d.setHours(0,0,0,0); return d < today; }).length;
    const todayReminders = petReminders.filter(r => { const d = parseDate(r.date); d.setHours(0,0,0,0); return d.getTime() === today.getTime(); }).length;
    const upcomingCount = petReminders.filter(r => { const d = parseDate(r.date); d.setHours(0,0,0,0); return d > today; }).length;
    const overdueVaccines = vaccines.filter(v => {
      if (v.petId !== petId || !v.nextDueDate) return false;
      const d = parseDate(v.nextDueDate); d.setHours(0,0,0,0); return d < today;
    }).length;
    const hasVaccines = vaccines.some(v => v.petId === petId);
    const healthScore = calcHealthScore(overdueReminders, overdueVaccines, upcomingCount, hasVaccines);
    const pet = pets.find(p => p.id === petId);
    const birthdayCountdown = pet?.dob ? calcBirthdayCountdown(pet.dob) : null;
    return { overdueReminders, todayReminders, upcomingCount, overdueVaccines, healthScore, birthdayCountdown };
  };

  const filteredAndSortedPets = useMemo(() => {
    let filtered = [...pets];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q) ||
        (p.breed?.toLowerCase().includes(q) ?? false)
      );
    }
    if (selectedSpecies.length > 0) {
      filtered = filtered.filter(p => selectedSpecies.includes(p.species));
    }
    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'species') return a.species.localeCompare(b.species);
      if (sortBy === 'events') {
        const sa = getPetStats(a.id);
        const sb = getPetStats(b.id);
        return (sb.overdueReminders + sb.todayReminders + sb.upcomingCount) -
               (sa.overdueReminders + sa.todayReminders + sa.upcomingCount);
      }
      return 0;
    });
    return filtered;
  }, [pets, searchQuery, selectedSpecies, sortBy, reminders, vaccines]);

  const availableSpecies = useMemo(() =>
    [...new Set(pets.map(p => p.species))].map(s => ({ id: s, label: s })),
    [pets]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecies([]);
    setSortBy('name');
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };

  const openFilterSheet = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    filterSheetRef.current?.present();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('home.title')}</Text>
        </View>
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (pets.length === 0) {
    return (
      <SafeAreaView style={[styles.containerEmpty, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="paw"
          iconLib="mci"
          title={t('home.noPets')}
          message={t('home.noPetsMsg')}
          hint={t('home.noPetsHint')}
          actionLabel={t('home.addPet')}
          onAction={() => router.push('/(tabs)/add-pet')}
        />
      </SafeAreaView>
    );
  }

  const listHeader = (
    <>
      {/* Banner de aniversário */}
      {!!birthdayPet && (
        <BirthdayBanner
          petName={birthdayPet.name}
          age={birthdayPet.age}
          species={birthdayPet.species}
          onDismiss={() => setBirthdayPet(null)}
        />
      )}

      {/* Widget Hoje */}
      <TodayWidget
        pets={pets}
        reminders={reminders}
        vaccines={vaccines}
        onPress={() => router.push('/calendar')}
      />

      {/* Desafio Semanal */}
      <ChallengeCard
        challenge={getCurrentChallenge()}
        completed={challengeCompleted}
        daysLeft={challengeDaysLeft}
      />

      {/* Vacinas próximas / vencidas */}
      <UpcomingVaccinesCard pets={pets} vaccines={vaccines} />

      {/* Serviços Próximos */}
      <TouchableOpacity
        style={[styles.nearbyBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/nearby');
        }}
        activeOpacity={0.8}
      >
        <View style={styles.nearbyIconCircle}>
          <Ionicons name="map-outline" size={22} color={Theme.primary} />
        </View>
        <View style={styles.nearbyText}>
          <Text style={[styles.nearbyTitle, { color: colors.text.primary }]}>{t('home.nearbyServices')}</Text>
          <Text style={[styles.nearbySubtitle, { color: colors.text.secondary }]}>{t('home.nearbyServicesDesc')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
      </TouchableOpacity>

      {/* Barra de busca */}
      <View style={styles.searchRow}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('home.searchPlaceholder')}
        />
      </View>

      {/* Chips de filtro ativos */}
      {(selectedSpecies.length > 0 || sortBy !== 'name') && (
        <View style={styles.activeFiltersRow}>
          {selectedSpecies.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.activeFilterChip, { backgroundColor: Theme.primary + '20', borderColor: Theme.primary }]}
              onPress={() => {
                setSelectedSpecies(prev => prev.filter(x => x !== s));
                if (Platform.OS !== 'web') Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.activeFilterText, { color: Theme.primary }]}>{s}</Text>
              <Ionicons name="close" size={12} color={Theme.primary} />
            </TouchableOpacity>
          ))}
          {sortBy !== 'name' && (
            <TouchableOpacity
              style={[styles.activeFilterChip, { backgroundColor: Theme.primary + '20', borderColor: Theme.primary }]}
              onPress={() => { setSortBy('name'); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
            >
              <Text style={[styles.activeFilterText, { color: Theme.primary }]}>
                {sortBy === 'species' ? t('common.species') : t('common.events')}
              </Text>
              <Ionicons name="close" size={12} color={Theme.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearFilters} style={styles.clearAllBtn}>
            <Text style={[styles.clearAllText, { color: colors.text.light }]}>{t('common.clearAll')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sem resultados de filtro */}
      {filteredAndSortedPets.length === 0 && (
        <View style={styles.emptyFiltered}>
          <EmptyState
            icon="search"
            title={t('common.noResults')}
            message={t('common.noResultsMsg')}
            actionLabel={t('common.clearFilters')}
            onAction={clearFilters}
          />
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header fixo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('home.title')}</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{pets.length}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {(!!streak && (streak.currentStreak > 0 || streak.vacationMode)) && (
            <StreakBadge
              streak={streak.currentStreak}
              best={streak.bestStreak}
              vacationMode={streak.vacationMode}
              onVacationToggle={(updated) => setStreak(updated)}
            />
          )}
          <TouchableOpacity
            style={[
              styles.filterBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              activeFiltersCount > 0 && { borderColor: Theme.primary, backgroundColor: Theme.primary + '15' },
            ]}
            onPress={openFilterSheet}
          >
            <Ionicons name="options-outline" size={18} color={activeFiltersCount > 0 ? Theme.primary : colors.text.secondary} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de aniversário */}
      {!!birthdayModal && (
        <BirthdayModal
          visible={!!birthdayModal}
          petName={birthdayModal.name}
          age={birthdayModal.age}
          species={birthdayModal.species}
          onClose={() => setBirthdayModal(null)}
        />
      )}

      {/* FlatList que rola toda a tela */}
      <FlatList
        data={filteredAndSortedPets}
        keyExtractor={item => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const stats = getPetStats(item.id);
          return (
            <SwipePetCard
              pet={item}
              index={index}
              {...stats}
              onPress={() => router.push({ pathname: '/pet/[id]', params: { id: item.id } })}
              onDelete={() => confirmDelete(item)}
            />
          );
        }}
      />

      {/* Banner AdMob */}
      <AdBanner />

      {/* FAB Expandível */}
      {fabOpen && (
        <TouchableOpacity style={styles.fabOverlay} activeOpacity={1} onPress={toggleFab} />
      )}

      {/* Mini FAB: Novo Lembrete */}
      <Animated.View style={[styles.miniFabContainer, miniFab1Style]} pointerEvents={fabOpen ? 'auto' : 'none'}>
        <TouchableOpacity
          style={[styles.miniFab, {
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }
              : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 }),
          }]}
          onPress={handleReminderFab}
          activeOpacity={0.85}
        >
          <Ionicons name="alarm-outline" size={20} color={Theme.primary} />
        </TouchableOpacity>
        <Text style={styles.miniFabLabel}>{t('reminders.newReminder')}</Text>
      </Animated.View>

      {/* Mini FAB: Novo Pet */}
      <Animated.View style={[styles.miniFabContainer, miniFab2Style]} pointerEvents={fabOpen ? 'auto' : 'none'}>
        <TouchableOpacity
          style={[styles.miniFab, {
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }
              : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 }),
          }]}
          onPress={() => { toggleFab(); router.push('/(tabs)/add-pet'); }}
          activeOpacity={0.85}
        >
          <Ionicons name="paw-outline" size={20} color={Theme.primary} />
        </TouchableOpacity>
        <Text style={styles.miniFabLabel}>{t('common.addPet')}</Text>
      </Animated.View>

      {/* FAB Principal */}
      <TouchableOpacity
        style={[styles.fab, {
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 6px 16px rgba(64,224,208,0.45)' }
            : { shadowColor: '#40E0D0', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 }),
        }]}
        onPress={toggleFab}
        activeOpacity={0.85}
      >
        <Animated.View style={fabIconStyle}>
          <Ionicons name="add" size={28} color="#fff" />
        </Animated.View>
      </TouchableOpacity>

      {/* BottomSheet de Filtros */}
      <AppBottomSheetModal
        ref={filterSheetRef}
        title={t('common.filter')}
        snapPoints={['52%']}
        scrollable
      >
        {/* Ordenação */}
        <Text style={[styles.sheetSectionLabel, { color: colors.text.secondary }]}>{t('common.sortBy')}</Text>
        <View style={styles.chipsRow}>
          {(['name', 'species', 'events'] as const).map(opt => (
            <OptionChip
              key={opt}
              label={opt === 'name' ? t('common.name') : opt === 'species' ? t('common.species') : t('common.events')}
              active={sortBy === opt}
              onPress={() => setSortBy(opt)}
            />
          ))}
        </View>

        {/* Espécie */}
        {availableSpecies.length > 1 && (
          <>
            <Text style={[styles.sheetSectionLabel, { color: colors.text.secondary, marginTop: 20 }]}>
              {t('home.filterBy')}
            </Text>
            <View style={styles.chipsRow}>
              {availableSpecies.map(s => (
                <OptionChip
                  key={s.id}
                  label={s.label}
                  active={selectedSpecies.includes(s.id)}
                  onPress={() =>
                    setSelectedSpecies(prev =>
                      prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                    )
                  }
                />
              ))}
            </View>
          </>
        )}

        {/* Botão limpar */}
        {activeFiltersCount > 0 && (
          <TouchableOpacity
            style={[styles.clearSheetBtn, { borderColor: colors.border }]}
            onPress={() => {
              clearFilters();
              filterSheetRef.current?.dismiss();
            }}
          >
            <Ionicons name="refresh" size={16} color={colors.text.secondary} />
            <Text style={[styles.clearSheetText, { color: colors.text.secondary }]}>{t('common.clearFilters')}</Text>
          </TouchableOpacity>
        )}
      </AppBottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginRight: 10 },
  counterBadge: {
    backgroundColor: Theme.primary,
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  counterText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Filter button
  filterBtn: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Theme.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Search
  searchRow: { paddingHorizontal: 20, paddingBottom: 6 },

  // Active filter chips
  activeFiltersRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 8, gap: 6,
  },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  activeFilterText: { fontSize: 12, fontWeight: '600' },
  clearAllBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  clearAllText: { fontSize: 12 },

  // Lista
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyFiltered: { flex: 1, justifyContent: 'center', padding: 20 },

  // Swipe card
  swipeContainer: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  deleteBackground: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: DELETE_WIDTH,
    backgroundColor: Theme.danger,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  deleteBackgroundText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  petCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16,
    ...Shadows.small,
  },
  petInfo: { flex: 1, marginLeft: 14 },
  petName: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  petMeta: { fontSize: 13, marginBottom: 2 },
  petAge: { fontSize: 12, marginBottom: 6 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { marginRight: 4, marginTop: 2 },
  healthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  healthDot: { fontSize: 10 },
  healthLabel: { fontSize: 11, fontWeight: '700' },
  birthdayChip: {
    backgroundColor: '#FF6B9D18',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  birthdayChipText: { fontSize: 11, fontWeight: '700' },

  // Nearby banner
  nearbyBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 10,
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 11, gap: 12,
  },
  nearbyIconCircle: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Theme.primary + '18',
    justifyContent: 'center', alignItems: 'center',
  },
  nearbyText: { flex: 1 },
  nearbyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 1 },
  nearbySubtitle: { fontSize: 12 },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Theme.primary,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.primary,
  },
  fabOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  miniFabContainer: {
    position: 'absolute', bottom: 28, right: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
  },
  miniFab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  miniFabLabel: {
    position: 'absolute', right: 58,
    fontSize: 13, fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Bottom Sheet conteúdo
  sheetSectionLabel: {
    fontSize: 12, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  optionChipText: { fontSize: 13, fontWeight: '600' },
  clearSheetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 24,
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 12,
  },
  clearSheetText: { fontSize: 14, fontWeight: '600' },
});
