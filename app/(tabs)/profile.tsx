import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Modal, Image,
} from 'react-native';
import { Shadows } from '../../constants/Shadows';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, UserProfile, Reminder, VaccineRecord, Achievement } from '../../types/pet';
import { Theme } from '../../constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import StatCard from '../../components/StatCard';
import PetAvatar from '../../components/PetAvatar';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getInitialLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n';
import { ACHIEVEMENTS, groupAchievements, checkAndUnlockAchievements } from '../../hooks/useAchievements';
import AchievementGroupSection from '../../components/AchievementGroupSection';
import {
  CHALLENGES, getCurrentChallenge, loadChallengeState, completeChallenge, autoCompleteDataChallenge,
} from '../../hooks/useChallenges';

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

const getAvatarColor = (name: string): string => {
  const palette = ['#FF6B9D', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#40E0D0', '#F44336', '#8D6E63'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const getInitials = (name: string): string =>
  name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const parseDate = (s: string): Date => {
  const p = s.split('/');
  if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(s);
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [pets, setPets] = useState<Pet[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [completedChallengeIds, setCompletedChallengeIds] = useState<string[]>([]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('pt-BR');
  const { t } = useTranslation();

  useEffect(() => {
    getInitialLanguage().then(setCurrentLang);
  }, []);

  const handleChangeLanguage = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    changeLanguage(lang).catch(() => {});
  };

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const [pJSON, profJSON, rJSON, vJSON, weightJSON, streakJSON] = await Promise.all([
            AsyncStorage.getItem('pets'),
            AsyncStorage.getItem('userProfile'),
            AsyncStorage.getItem('reminders'),
            AsyncStorage.getItem('vaccinations'),
            AsyncStorage.getItem('weightRecords'),
            AsyncStorage.getItem('streakData'),
          ]);

          const parsedPets: Pet[] = pJSON ? JSON.parse(pJSON) : [];
          const parsedReminders: Reminder[] = rJSON ? JSON.parse(rJSON) : [];
          const parsedVaccines: VaccineRecord[] = vJSON ? JSON.parse(vJSON) : [];

          setPets(parsedPets);
          setProfile(profJSON ? JSON.parse(profJSON) : null);
          setReminders(parsedReminders);
          setVaccines(parsedVaccines);

          // Checar e desbloquear conquistas
          await checkAndUnlockAchievements({
            pets: parsedPets,
            reminders: parsedReminders,
            vaccines: parsedVaccines,
            weightRecords: weightJSON ? JSON.parse(weightJSON) : [],
            streak: streakJSON ? JSON.parse(streakJSON) : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 },
          });
          const achJSON = await AsyncStorage.getItem('achievements');
          setUnlockedAchievements(achJSON ? JSON.parse(achJSON) : []);

          // Carregar estado do desafio
          const { completed, completedIds } = await loadChallengeState();
          setChallengeCompleted(completed);
          setCompletedChallengeIds(completedIds);

          // Auto-completar desafios sem ação direta (ex: complete_profile, health_care)
          const wasAutoCompleted = await autoCompleteDataChallenge({
            hasPets: parsedPets.length > 0,
            hasVaccines: parsedVaccines.length > 0,
            hasReminders: parsedReminders.length > 0,
            hasProfile: !!(profJSON && JSON.parse(profJSON)?.name?.trim()),
          });
          if (wasAutoCompleted) setChallengeCompleted(true);
        } catch (e) {
          console.error('Erro ao carregar perfil:', e);
        }
      };
      load();
    }, [])
  );

  // ── Urgência ──────────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueReminders = reminders.filter(r => {
    const d = parseDate(r.date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  const todayReminders = reminders.filter(r => {
    const d = parseDate(r.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const upcomingReminders = reminders.filter(r => {
    const d = parseDate(r.date);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  });

  const overdueVaccines = vaccines.filter(v => {
    if (!v.nextDueDate) return false;
    const d = parseDate(v.nextDueDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  const hasUrgency = overdueReminders.length > 0 || todayReminders.length > 0 || overdueVaccines.length > 0;

  const getPetUrgency = (petId: string): 'danger' | 'warning' | null => {
    const hasOverdue = reminders.some(r => {
      const d = parseDate(r.date);
      d.setHours(0, 0, 0, 0);
      return r.petId === petId && d < today;
    });
    const hasVaccineOverdue = vaccines.some(v => {
      if (v.petId !== petId || !v.nextDueDate) return false;
      const d = parseDate(v.nextDueDate);
      d.setHours(0, 0, 0, 0);
      return d < today;
    });
    if (hasOverdue || hasVaccineOverdue) return 'danger';
    const hasToday = reminders.some(r => {
      const d = parseDate(r.date);
      d.setHours(0, 0, 0, 0);
      return r.petId === petId && d.getTime() === today.getTime();
    });
    if (hasToday) return 'warning';
    return null;
  };

  // ── Desafio da semana ─────────────────────────────────────────────────────
  const currentChallenge = getCurrentChallenge();
  const isDoneBefore = completedChallengeIds.includes(currentChallenge.id) && !challengeCompleted;
  const currentIndex = CHALLENGES.findIndex(c => c.id === currentChallenge.id);
  const nextChallenge = CHALLENGES[(currentIndex + 1) % CHALLENGES.length];
  const pendingChallenges = CHALLENGES.filter(c => !completedChallengeIds.includes(c.id) && c.id !== currentChallenge.id);

  const handleCompleteChallenge = async () => {
    await completeChallenge(currentChallenge.id);
    setChallengeCompleted(true);
    setCompletedChallengeIds(prev =>
      prev.includes(currentChallenge.id) ? prev : [...prev, currentChallenge.id]
    );
  };

  const handleChallengeAction = () => {
    if (currentChallenge.route) {
      router.push(currentChallenge.route as any);
    }
  };

  // ── Conquistas ────────────────────────────────────────────────────────────
  const unlockedIds = unlockedAchievements.map(a => a.id);
  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.length;

  const displayName = profile?.name || t('profile.yourName');
  const initials = getInitials(displayName);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('profile.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/monthly-report')}
          >
            <Ionicons name="document-text-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/calendar')}
          >
            <Ionicons name="calendar-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/(tabs)/statistics')}
          >
            <MaterialCommunityIcons name="chart-bar" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setSettingsVisible(true)}>
            <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Seção do usuário ── */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.userAvatar, { backgroundColor: Theme.primary }]}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <Text style={[styles.userName, { color: colors.text.primary }]}>{displayName}</Text>
          {!!(profile?.bio) && (
            <Text style={[styles.userBio, { color: colors.text.secondary }]}>{profile.bio}</Text>
          )}
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: colors.primary }]}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="create-outline" size={15} color={colors.primary} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Estatísticas ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('profile.resume')}</Text>
          <View style={styles.statsRow}>
            <StatCard icon="paw" value={pets.length} label={t('profile.stats.pets')} color={Theme.primary} />
            <StatCard
              icon="calendar-check"
              value={upcomingReminders.length}
              label={t('profile.stats.events')}
              color={Theme.categories.Consulta.main}
            />
            <StatCard
              icon="needle"
              value={vaccines.length}
              label={t('profile.stats.vaccines')}
              color={Theme.categories.Saúde.main}
            />
            <StatCard
              icon="trophy"
              value={unlockedCount}
              label={t('profile.stats.trophies')}
              color="#FF9800"
            />
          </View>
        </View>

        {/* ── Painel de urgência ── */}
        {hasUrgency && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('profile.attention')}</Text>
            <View style={[styles.urgencyCard, { backgroundColor: colors.surface, borderColor: Theme.danger + '40' }]}>
              {overdueReminders.length > 0 && (
                <View style={styles.urgencyRow}>
                  <View style={[styles.urgencyDot, { backgroundColor: Theme.danger }]} />
                  <Text style={[styles.urgencyText, { color: Theme.danger, fontWeight: '700' }]}>
                    {t('profile.overdueReminders', { count: overdueReminders.length })}
                  </Text>
                </View>
              )}
              {todayReminders.length > 0 && (
                <View style={styles.urgencyRow}>
                  <View style={[styles.urgencyDot, { backgroundColor: Theme.warning }]} />
                  <Text style={[styles.urgencyText, { color: Theme.warning, fontWeight: '700' }]}>
                    {t('profile.todayReminders', { count: todayReminders.length })}
                  </Text>
                </View>
              )}
              {overdueVaccines.length > 0 && (
                <View style={styles.urgencyRow}>
                  <View style={[styles.urgencyDot, { backgroundColor: Theme.danger }]} />
                  <Text style={[styles.urgencyText, { color: Theme.danger, fontWeight: '700' }]}>
                    {t('profile.overdueVaccines', { count: overdueVaccines.length })}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.urgencyAction, { borderTopColor: colors.border }]}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={[styles.urgencyActionText, { color: Theme.primary }]}>{t('common.seeMyPets')}</Text>
                <Ionicons name="arrow-forward" size={14} color={Theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Meus Pets ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('profile.myPets')}</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/add-pet')}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {pets.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/add-pet')}
            >
              <MaterialCommunityIcons name="paw-outline" size={28} color={colors.text.light} />
              <Text style={[styles.emptyCardText, { color: colors.text.light }]}>{t('profile.addFirstPet')}</Text>
            </TouchableOpacity>
          ) : (
            <FlatList
              data={pets}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const urgency = getPetUrgency(item.id);
                return (
                  <TouchableOpacity
                    style={styles.petItem}
                    onPress={() => router.push({ pathname: '/pet/[id]', params: { id: item.id } })}
                  >
                    <View style={styles.petAvatarWrapper}>
                      <PetAvatar species={item.species} photoUri={item.photoUri} size="medium" />
                      {!!urgency && (
                        <View style={[
                          styles.urgencyBadge,
                          { backgroundColor: urgency === 'danger' ? Theme.danger : Theme.warning },
                        ]} />
                      )}
                    </View>
                    <Text style={[styles.petName, { color: colors.text.primary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {!!item.species && (
                      <Text style={[styles.petSpecies, { color: colors.text.light }]} numberOfLines={1}>
                        {item.species}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* ── Desafio da Semana ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('profile.weeklyChallenge')}</Text>
          <View style={[styles.challengeCard, {
            backgroundColor: colors.surface,
            borderColor: challengeCompleted ? Theme.success + '60' : currentChallenge.color + '40',
            ...Shadows.small,
          }]}>
            {/* Ícone + badge */}
            <View style={styles.challengeTop}>
              <View style={[styles.challengeIconCircle, { backgroundColor: currentChallenge.color + '20' }]}>
                <MaterialCommunityIcons
                  name={currentChallenge.icon as MCIName}
                  size={32}
                  color={currentChallenge.color}
                />
              </View>
              {challengeCompleted && (
                <View style={[styles.challengeDoneBadge, { backgroundColor: Theme.success }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                  <Text style={styles.challengeDoneBadgeText}>{t('profile.concluedBadge')}</Text>
                </View>
              )}
              {isDoneBefore && (
                <View style={[styles.challengeDoneBadge, { backgroundColor: Theme.success + 'CC' }]}>
                  <MaterialCommunityIcons name="history" size={12} color="#fff" />
                  <Text style={styles.challengeDoneBadgeText}>{t('profile.concluedBefore')}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.challengeTitle, { color: colors.text.primary }]}>
              {t(`challenges.items.${currentChallenge.id}.title`, { defaultValue: currentChallenge.title })}
            </Text>
            <Text style={[styles.challengeDesc, { color: colors.text.secondary }]}>
              {t(`challenges.items.${currentChallenge.id}.description`, { defaultValue: currentChallenge.description })}
            </Text>

            {/* Dica */}
            <View style={[styles.tipBox, { backgroundColor: currentChallenge.color + '12', borderColor: currentChallenge.color + '30' }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={currentChallenge.color} />
              <Text style={[styles.tipText, { color: colors.text.secondary }]}>{t(`challenges.items.${currentChallenge.id}.tip`, { defaultValue: currentChallenge.tip })}</Text>
            </View>

            {/* Ações */}
            {challengeCompleted ? (
              <View>
                <View style={[styles.completedRow, { backgroundColor: Theme.success + '15' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={Theme.success} />
                  <Text style={[styles.completedText, { color: Theme.success }]}>
                    {t('profile.challengeDone')}
                  </Text>
                </View>

                {/* Próximo desafio */}
                <View style={[styles.nextChallengeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.nextChallengeLabel, { color: colors.text.light }]}>
                    {t('profile.nextChallenge')}
                  </Text>
                  <View style={styles.nextChallengeRow}>
                    <View style={[styles.nextChallengeIcon, { backgroundColor: nextChallenge.color + '20' }]}>
                      <MaterialCommunityIcons name={nextChallenge.icon as any} size={18} color={nextChallenge.color} />
                    </View>
                    <Text style={[styles.nextChallengeTitle, { color: colors.text.primary }]} numberOfLines={1}>
                      {t(`challenges.items.${nextChallenge.id}.title`, { defaultValue: nextChallenge.title })}
                    </Text>
                  </View>
                  {pendingChallenges.length > 0 && (
                    <Text style={[styles.nextChallengePending, { color: colors.text.light }]}>
                      {t('profile.pendingChallenges', { count: pendingChallenges.length })}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.challengeBtns}>
                {currentChallenge.action !== 'none' && (
                  <TouchableOpacity
                    style={[styles.challengeActionBtn, { backgroundColor: currentChallenge.color }]}
                    onPress={handleChallengeAction}
                  >
                    <MaterialCommunityIcons name="arrow-right-circle-outline" size={18} color="#fff" />
                    <Text style={styles.challengeActionBtnText}>{t('profile.doNow')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.challengeMarkBtn, { borderColor: currentChallenge.color }]}
                  onPress={handleCompleteChallenge}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={currentChallenge.color} />
                  <Text style={[styles.challengeMarkBtnText, { color: currentChallenge.color }]}>
                    {t('profile.markDone')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Progresso histórico */}
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, {
              backgroundColor: Theme.success,
              width: `${(completedChallengeIds.length / CHALLENGES.length) * 100}%` as any,
            }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.text.light }]}>
            {t('profile.challengesCompleted', { done: completedChallengeIds.length, total: CHALLENGES.length })}
          </Text>
        </View>

        {/* ── Conquistas ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('profile.achievements')}</Text>
            <View style={[styles.achCountBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.achCountText, { color: colors.primary }]}>
                {unlockedCount}/{totalAchievements}
              </Text>
            </View>
          </View>

          {/* Barra de progresso geral */}
          <View style={[styles.achProgressCard, { backgroundColor: colors.card }]}>
            <View style={styles.achProgressRow}>
              <MaterialCommunityIcons name="trophy" size={20} color="#FFB800" />
              <Text style={[styles.achProgressNumbers, { color: colors.text.primary }]}>
                {unlockedCount}
                <Text style={{ color: colors.text.light, fontSize: 16 }}>/{totalAchievements}</Text>
              </Text>
              <Text style={[styles.achProgressPct, { color: colors.text.secondary }]}>
                {Math.round((unlockedCount / totalAchievements) * 100)}{t('profile.complete')}
              </Text>
            </View>
            <View style={[styles.achProgressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.achProgressFill, {
                width: `${Math.round((unlockedCount / totalAchievements) * 100)}%` as any,
              }]} />
            </View>
          </View>

          {/* Grupos */}
          {groupAchievements(unlockedIds).map(({ group, achievements, unlockedCount: gc }) => (
            <AchievementGroupSection
              key={group.id}
              group={group}
              achievements={achievements}
              unlockedCount={gc}
              unlockedAchievements={unlockedAchievements}
              defaultCollapsed={gc === 0}
            />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Modal de Configurações ── */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('profile.settings.title')}</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={26} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary }]}>{t('profile.settings.appearance')}</Text>
              <ThemeToggle />
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary, marginTop: 16 }]}>{t('profile.settings.language')}</Text>
              <View style={[styles.langRow]}>
                {([
                  { lang: 'pt-BR', label: 'Português' },
                  { lang: 'en', label: 'English' },
                  { lang: 'es', label: 'Español' },
                ] as { lang: SupportedLanguage; label: string }[]).map(({ lang, label }) => {
                  const active = currentLang === lang;
                  return (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.langChip,
                        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '18' : colors.background },
                      ]}
                      onPress={() => handleChangeLanguage(lang)}
                    >
                      <Text style={[styles.langChipText, { color: active ? colors.primary : colors.text.secondary, fontWeight: active ? '700' : '400' }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary, marginTop: 16 }]}>{t('profile.settings.account')}</Text>
              <TouchableOpacity
                style={[styles.modalItem, { backgroundColor: colors.background }]}
                onPress={() => { setSettingsVisible(false); router.push('/profile/edit'); }}
              >
                <Ionicons name="create-outline" size={22} color={colors.text.primary} />
                <Text style={[styles.modalItemText, { color: colors.text.primary }]}>{t('profile.editProfile')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { padding: 6, marginLeft: 8 },
  scrollContent: { paddingBottom: 40 },

  // Profile card
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  userAvatar: {
    width: 96, height: 96, borderRadius: 48,
    marginBottom: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarInitials: { fontSize: 34, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  userBio: { fontSize: 14, marginBottom: 14, textAlign: 'center' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', marginLeft: 5 },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  addBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', marginHorizontal: -4, gap: 4 },

  // Urgency
  urgencyCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  urgencyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  urgencyText: { fontSize: 14 },
  urgencyAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderTopWidth: 1,
  },
  urgencyActionText: { fontSize: 14, fontWeight: '600', marginRight: 4 },

  // Pets
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 20,
  },
  emptyCardText: { fontSize: 14, marginLeft: 10 },
  horizontalList: { paddingVertical: 4, paddingRight: 20 },
  petItem: { alignItems: 'center', marginRight: 16, width: 68 },
  petAvatarWrapper: { position: 'relative', marginBottom: 6 },
  urgencyBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff',
  },
  petName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  petSpecies: { fontSize: 11, textAlign: 'center', marginTop: 2 },

  // Challenge
  challengeCard: { borderRadius: 16, padding: 18, borderWidth: 1.5, marginBottom: 12 },
  challengeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  challengeIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  challengeDoneBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  challengeDoneBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  challengeTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  challengeDesc: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18, marginLeft: 8 },
  completedRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10,
  },
  completedText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  nextChallengeBox: {
    marginTop: 10, borderRadius: 10, borderWidth: 1,
    padding: 12,
  },
  nextChallengeLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  nextChallengeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextChallengeIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  nextChallengeTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  nextChallengePending: { fontSize: 12, marginTop: 6 },
  challengeBtns: { flexDirection: 'row', flexWrap: 'wrap' },
  challengeActionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginRight: 10, marginBottom: 8,
  },
  challengeActionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 6 },
  challengeMarkBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, marginBottom: 8,
  },
  challengeMarkBtnText: { fontSize: 14, fontWeight: '700', marginLeft: 6 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 12, marginTop: 6 },

  // Achievements
  achCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  achCountText: { fontSize: 13, fontWeight: '700' },
  // Achievement groups + progress
  achProgressCard: {
    borderRadius: 14, padding: 14, marginBottom: 16,
    ...Shadows.small,
  },
  achProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  achProgressNumbers: { fontSize: 26, fontWeight: '800' },
  achProgressPct: { fontSize: 13, marginLeft: 'auto' as any },
  achProgressBar: { height: 7, borderRadius: 4, overflow: 'hidden' },
  achProgressFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFB800' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%',
    ...Shadows.medium,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12 },
  modalItemText: { flex: 1, fontSize: 15, fontWeight: '500', marginLeft: 12 },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  langChip: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1.5 },
  langChipText: { fontSize: 13 },
});
