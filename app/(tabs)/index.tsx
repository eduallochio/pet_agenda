import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPets, deleteRemote, recordDeletion } from '../../services/syncService';
import { secureGet } from '../../services/secureStorage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState, useMemo, useRef } from 'react';
import {
  FlatList, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Pet, Reminder, VaccineRecord } from '../../types/pet';
import { Theme, getSpeciesColor } from '../../constants/Colors';
import PetAvatar from '../../components/PetAvatar';
import FadeIn from '../../components/animations/FadeIn';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import AdBanner from '../../components/AdBanner';
import FarewellModal from '../../components/FarewellModal';
import DeleteReasonModal from '../../components/DeleteReasonModal';
import NoticeModal from '../../components/NoticeModal';
import SelectPetModal from '../../components/SelectPetModal';
import { AppBottomSheetModal } from '../../components/AppBottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
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
  todayReminders: number,
): { score: number; color: string; label: string } {
  let score = 100;
  score -= Math.min(overdueReminders, 2) * 20;
  score -= Math.min(overdueVaccines, 2) * 25;
  score -= Math.min(todayReminders, 2) * 10;
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
    .enabled(!pet.isMemorial)
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

  const speciesColor = getSpeciesColor(pet.species);

  return (
    <FadeIn delay={index * 60}>
      <View style={styles.swipeContainer}>
        {/* Fundo vermelho — oculto para pets memorial */}
        {!pet.isMemorial && (
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
        )}

        {/* Card deslizável */}
        <GestureDetector gesture={Gesture.Race(panGesture, tapGesture)}>
          <Animated.View
            style={[
              styles.petCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              cardStyle,
            ]}
          >
            {/* Avatar circular com cor da espécie */}
            <View style={[styles.petAvatarCircle, { backgroundColor: speciesColor + '22' }]}>
              {pet.photoUri ? (
                <PetAvatar species={pet.species} photoUri={pet.photoUri} size="large" />
              ) : (
                <Ionicons
                  name={pet.species === 'Gato' ? 'logo-octocat' : pet.species === 'Pássaro' ? 'leaf-outline' : 'paw'}
                  size={28}
                  color={speciesColor}
                />
              )}
            </View>

            <View style={styles.petInfo}>
              {/* Nome + health score em linha */}
              <View style={styles.petNameRow}>
                <Text style={[styles.petName, { color: colors.text.primary }]} numberOfLines={1}>{pet.name}</Text>
                {pet.isMemorial ? (
                  <View style={[styles.healthBadge, { backgroundColor: '#9C27B018' }]}>
                    <Text style={{ fontSize: 10 }}>🌈</Text>
                    <Text style={[styles.healthBadgeText, { color: '#9C27B0' }]}>Memorial</Text>
                  </View>
                ) : (
                  <View style={[styles.healthBadge, { backgroundColor: healthScore.color + '18' }]}>
                    <View style={[styles.healthDot, { backgroundColor: healthScore.color }]} />
                    <Text style={[styles.healthBadgeText, { color: healthScore.color }]}>{healthScore.score}</Text>
                  </View>
                )}
              </View>

              {/* Espécie · Raça + Idade em linha */}
              <Text style={[styles.petMeta, { color: colors.text.secondary }]} numberOfLines={1}>
                {[pet.species, pet.breed].filter(Boolean).join(' · ')}{age ? ` · ${age}` : ''}
              </Text>

              {/* Badges de alerta com ícones */}
              {(overdueReminders > 0 || todayReminders > 0 || overdueVaccines > 0 || upcomingCount > 0 ||
                (birthdayCountdown !== null && birthdayCountdown <= 7)) && (
                <View style={styles.badgesRow}>
                  {overdueReminders > 0 && (
                    <View style={[styles.iconBadge, { backgroundColor: '#F4433618' }]}>
                      <Ionicons name="warning-outline" size={10} color="#F44336" />
                      <Text style={[styles.iconBadgeText, { color: '#F44336' }]}>
                        {t('home.overdue', { count: overdueReminders })}
                      </Text>
                    </View>
                  )}
                  {todayReminders > 0 && (
                    <View style={[styles.iconBadge, { backgroundColor: '#FF980018' }]}>
                      <Ionicons name="alarm-outline" size={10} color="#FF9800" />
                      <Text style={[styles.iconBadgeText, { color: '#FF9800' }]}>
                        {t('home.today', { count: todayReminders })}
                      </Text>
                    </View>
                  )}
                  {overdueVaccines > 0 && (
                    <View style={[styles.iconBadge, { backgroundColor: '#F4433618' }]}>
                      <Ionicons name="medical-outline" size={10} color="#F44336" />
                      <Text style={[styles.iconBadgeText, { color: '#F44336' }]}>
                        {t('home.overdueVaccine', { count: overdueVaccines })}
                      </Text>
                    </View>
                  )}
                  {upcomingCount > 0 && overdueReminders === 0 && todayReminders === 0 && (
                    <View style={[styles.iconBadge, { backgroundColor: '#2196F318' }]}>
                      <Ionicons name="calendar-outline" size={10} color="#2196F3" />
                      <Text style={[styles.iconBadgeText, { color: '#2196F3' }]}>
                        {upcomingCount} {t('home.upcoming', { defaultValue: 'próximos' })}
                      </Text>
                    </View>
                  )}
                  {birthdayCountdown !== null && birthdayCountdown <= 7 && (
                    <View style={[styles.iconBadge, { backgroundColor: '#FF6B9D22' }]}>
                      <Text style={[styles.iconBadgeText, { color: '#FF6B9D' }]}>
                        {birthdayCountdown === 0 ? '🎂 Hoje!' : `🎂 ${birthdayCountdown}d`}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
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
  const [farewell, setFarewell] = useState<{ name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState<{ pet: Pet } | null>(null);
  const [notice, setNotice] = useState<{ type: 'info'|'warning'|'error'|'success'; title: string; message: string } | null>(null);
  const [selectPetVisible, setSelectPetVisible] = useState(false);

  const handleAddPet = () => {
    router.push('/(tabs)/add-pet');
  };
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'species' | 'events'>('name');
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
      setSelectPetVisible(true);
    }
  };

  const activeFiltersCount = (selectedSpecies.length > 0 ? 1 : 0) + (sortBy !== 'name' ? 1 : 0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [petsJSON, remindersJSON, vaccinesJSON, profileJSON] = await Promise.all([
        AsyncStorage.getItem('pets'),
        AsyncStorage.getItem('reminders'),
        AsyncStorage.getItem('vaccinations'),
        secureGet('userProfile'),
      ]);

      const loadedPets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
      setPets(loadedPets);
      setReminders(remindersJSON ? JSON.parse(remindersJSON) : []);
      setVaccines(vaccinesJSON ? JSON.parse(vaccinesJSON) : []);
      if (profileJSON) {
        const profile = JSON.parse(profileJSON);
        setUserName(profile?.name || '');
      }
    } catch (e) {
      if (__DEV__) console.error('Erro ao carregar dados', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const handleDeletePet = async (petId: string, reason = 'other') => {
    try {
      const pet = pets.find(p => p.id === petId);
      const updated = pets.filter(p => p.id !== petId);
      await syncPets(updated);
      await deleteRemote('pets', petId);
      if (pet) recordDeletion({ petId, petName: pet.name, petSpecies: pet.species, reason, isMemorial: false }).catch(() => {});
      setPets(updated);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (pet) setFarewell({ name: pet.name });
    } catch {
      setNotice({ type: 'error', title: t('common.error'), message: t('home.deleteError') });
    }
  };

  const handleMemorialPet = async (petId: string) => {
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const pet = pets.find(p => p.id === petId);
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, isMemorial: true, memorialDate: `${dd}/${mm}/${yyyy}` }
          : p
      );
      await syncPets(updated);
      if (pet) recordDeletion({ petId, petName: pet.name, petSpecies: pet.species, reason: 'passed_away', isMemorial: true }).catch(() => {});
      setPets(updated);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (pet) setFarewell({ name: pet.name });
    } catch {
      setNotice({ type: 'error', title: t('common.error'), message: t('home.deleteError') });
    }
  };

  const confirmDelete = (pet: Pet) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteReason({ pet });
  };

  const getPetStats = (petId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const parseDateSafe = (s: string): Date | null => {
      const p = s.split('/');
      if (p.length === 3) {
        const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };
    const petReminders = reminders.filter(r => r.petId === petId && !r.completed);
    const overdueReminders = petReminders.filter(r => { const d = parseDateSafe(r.date); if (!d) return false; d.setHours(0,0,0,0); return d < today; }).length;
    const todayReminders = petReminders.filter(r => { const d = parseDateSafe(r.date); if (!d) return false; d.setHours(0,0,0,0); return d.getTime() === today.getTime(); }).length;
    const upcomingCount = petReminders.filter(r => { const d = parseDateSafe(r.date); if (!d) return false; d.setHours(0,0,0,0); return d > today && d <= in30Days; }).length;
    const overdueVaccines = vaccines.filter(v => {
      if (v.petId !== petId || !v.nextDueDate) return false;
      const d = parseDateSafe(v.nextDueDate); if (!d) return false; d.setHours(0,0,0,0); return d < today;
    }).length;
    const hasVaccines = vaccines.some(v => v.petId === petId);
    const healthScore = calcHealthScore(overdueReminders, overdueVaccines, upcomingCount, hasVaccines, todayReminders);
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
      <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greetingText, { color: colors.text.primary }]}>
              {t('home.greeting', { defaultValue: 'Olá' })}{userName ? `, ${userName}` : ''} 👋
            </Text>
          </View>
        </View>
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (pets.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.containerEmpty, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="paw"
          iconLib="mci"
          title={t('home.noPets')}
          message={t('home.noPetsMsg')}
          hint={t('home.noPetsHint')}
          actionLabel={t('home.addPet')}
          onAction={() => handleAddPet()}
        />
      </SafeAreaView>
    );
  }

  // Contadores para summary card
  const totalReminders = reminders.filter(r => !r.completed).length;
  const totalVaccines = vaccines.filter(v => {
    if (!v.nextDueDate) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const parts = v.nextDueDate.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      d.setHours(0,0,0,0);
      return d <= new Date(today.getTime() + 30 * 86400000);
    }
    return false;
  }).length;
  const totalConsultas = reminders.filter(r => !r.completed && r.category === 'Consulta').length;

  const listHeader = (
    <>
      {/* Summary Stats Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="alarm-outline" size={20} color="#FF9800" />
          </View>
          <Text style={[styles.statNum, { color: colors.text.primary }]}>{totalReminders}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('home.reminders', { defaultValue: 'Lembretes' })}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="medkit-outline" size={20} color="#4CAF50" />
          </View>
          <Text style={[styles.statNum, { color: colors.text.primary }]}>{totalVaccines}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('home.vaccines', { defaultValue: 'Vacina' })}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="calendar-outline" size={20} color="#2196F3" />
          </View>
          <Text style={[styles.statNum, { color: colors.text.primary }]}>{totalConsultas}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('home.consultations', { defaultValue: 'Consultas' })}</Text>
        </View>
      </View>

      {/* Banner Serviços Próximos */}
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
          <Text style={[styles.nearbyTitle, { color: colors.text.primary }]}>{t('home.nearbyServices', { defaultValue: 'Serviços Próximos' })}</Text>
          <Text style={[styles.nearbySubtitle, { color: colors.text.secondary }]}>{t('home.nearbyServicesDesc', { defaultValue: 'Vets, pet shops e mais perto de você' })}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
      </TouchableOpacity>

      {/* Barra de busca pill-shaped integrada */}
      <View style={[styles.searchPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color="#999999" />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('home.searchPlaceholder', { defaultValue: 'Buscar pets...' })}
          placeholderTextColor="#999999"
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[
            styles.searchFilterBtn,
            { backgroundColor: '#F2F3F0' },
            activeFiltersCount > 0 && { backgroundColor: Theme.primary + '15' },
          ]}
          onPress={openFilterSheet}
        >
          <Ionicons name="options-outline" size={18} color={activeFiltersCount > 0 ? Theme.primary : '#666666'} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Seção "Meus Pets" / "Ver todos" */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('home.title')}</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={[styles.sectionLink, { color: colors.text.secondary }]}>{t('home.viewAll', { defaultValue: 'Ver todos' })}</Text>
        </TouchableOpacity>
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
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header com saudação */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greetingText, { color: colors.text.primary }]}>
            {t('home.greeting', { defaultValue: 'Olá' })}{userName ? `, ${userName}` : ''} 👋
          </Text>
          <Text style={[styles.greetingSubtitle, { color: colors.text.secondary }]}>
            {t('home.greetingSubtitle', { defaultValue: 'Seus pets estão bem!' })}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

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

      <DeleteReasonModal
        visible={deleteReason !== null}
        petName={deleteReason?.pet.name ?? ''}
        onConfirmDelete={(reason) => {
          const pet = deleteReason?.pet;
          setDeleteReason(null);
          if (pet) handleDeletePet(pet.id, reason);
        }}
        onMemorial={() => {
          const pet = deleteReason?.pet;
          setDeleteReason(null);
          if (pet) handleMemorialPet(pet.id);
        }}
        onClose={() => setDeleteReason(null)}
      />

      <SelectPetModal
        visible={selectPetVisible}
        pets={pets.filter(p => !p.isMemorial)}
        title={t('common.selectPet')}
        onSelect={(pet) => {
          setSelectPetVisible(false);
          router.push({ pathname: '/reminder/new', params: { petId: pet.id } });
        }}
        onClose={() => setSelectPetVisible(false)}
      />

      <NoticeModal
        visible={notice !== null}
        type={notice?.type ?? 'error'}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        onConfirm={() => setNotice(null)}
      />

      <FarewellModal
        visible={farewell !== null}
        petName={farewell?.name ?? ''}
        onClose={() => setFarewell(null)}
      />

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
        <Text style={styles.miniFabLabel}>{t('reminders.newReminder', { defaultValue: 'Novo Lembrete' })}</Text>
      </Animated.View>

      {/* Mini FAB: Novo Pet */}
      <Animated.View style={[styles.miniFabContainer, miniFab2Style]} pointerEvents={fabOpen ? 'auto' : 'none'}>
        <TouchableOpacity
          style={[styles.miniFab, {
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }
              : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 }),
          }]}
          onPress={() => { toggleFab(); handleAddPet(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="paw-outline" size={20} color={Theme.primary} />
        </TouchableOpacity>
        <Text style={styles.miniFabLabel}>{t('common.addPet', { defaultValue: 'Novo Pet' })}</Text>
      </Animated.View>

      {/* FAB Principal */}
      <TouchableOpacity
        style={[styles.fab, {
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 4px 16px rgba(64,224,208,0.4)' }
            : { shadowColor: '#40E0D0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 }),
        }]}
        onPress={toggleFab}
        activeOpacity={0.85}
      >
        <Animated.View style={fabIconStyle}>
          <Ionicons name="add" size={24} color="#fff" />
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

  // Header - novo design com saudação
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetingText: { fontSize: 22, fontWeight: '700' },
  greetingSubtitle: { fontSize: 14, marginTop: 2 },
  bellBtn: { padding: 4 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },

  // Summary Stats Card
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 8 },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11 },

  // Section header
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionLink: { fontSize: 14 },

  // Serviços Próximos banner
  nearbyBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 14, gap: 12,
  },
  nearbyIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#40E0D022',
    alignItems: 'center', justifyContent: 'center',
  },
  nearbyText: { flex: 1 },
  nearbyTitle: { fontSize: 14, fontWeight: '600' },
  nearbySubtitle: { fontSize: 12, marginTop: 2 },

  // Search pill integrada
  searchPill: {
    flexDirection: 'row', alignItems: 'center',
    height: 48, borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16, paddingRight: 6,
    gap: 10,
  },
  searchInput: {
    flex: 1, fontSize: 14, paddingVertical: 0,
  },
  searchFilterBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF8C00',
    justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Active filter chips
  activeFiltersRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    marginBottom: 8, gap: 6,
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

  // Swipe card - novo design
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
    padding: 14, gap: 14,
    borderRadius: 16, borderWidth: 1,
  },
  petAvatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  petInfo: { flex: 1, gap: 4 },
  petNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  petName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  healthBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthBadgeText: { fontSize: 11, fontWeight: '700' },
  petMeta: { fontSize: 12 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  iconBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8,
  },
  iconBadgeText: { fontSize: 10, fontWeight: '600' },

  // FAB - com sombra turquesa
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Theme.primary,
    justifyContent: 'center', alignItems: 'center',
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
