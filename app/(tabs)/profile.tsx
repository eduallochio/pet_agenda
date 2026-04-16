import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Modal, Image, Platform, Alert, useWindowDimensions,
} from 'react-native';
import { Shadows } from '../../constants/Shadows';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureGet } from '../../services/secureStorage';
import AdBanner from '../../components/AdBanner';
import { Pet, UserProfile, Reminder, VaccineRecord, Achievement, WeightRecord } from '../../types/pet';
import { StreakData } from '../../hooks/useStreak';
import { Theme } from '../../constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PetAvatar from '../../components/PetAvatar';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getInitialLanguage, SupportedLanguage } from '../../i18n';
import { ACHIEVEMENTS, checkAndUnlockAchievements } from '../../hooks/useAchievements';
import AchievementUnlockModal from '../../components/AchievementUnlockModal';
import {
  CHALLENGES, getCurrentChallenge, loadChallengeState, completeChallenge, autoCompleteDataChallenge,
} from '../../hooks/useChallenges';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { requestBiometricAuth } from '../../services/biometricAuth';
import { supabase } from '../../services/supabase';
import { uploadToSupabase, downloadFromSupabase } from '../../services/syncService';
import { useNetworkSync, SyncStatus } from '../../hooks/useNetworkSync';
import Constants from 'expo-constants';
import { isBiometricAvailable } from '../../services/biometricAuth';

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
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 });
  const [unlockedAchievementId, setUnlockedAchievementId] = useState<string | null>(null);
  const { height: screenHeight } = useWindowDimensions();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('pt-BR');
  const [authUser, setAuthUser] = useState<{ email: string } | null>(null);
  const [hadAccount, setHadAccount] = useState(false);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const { status: syncStatus, lastSyncedAt } = useNetworkSync();
  const { t } = useTranslation();

  useEffect(() => {
    getInitialLanguage().then(setCurrentLang);
  }, []);

  useEffect(() => {
    // Carrega flag de conta prévia do storage
    AsyncStorage.multiGet(['hadAccount', 'lastEmail']).then(([[, had], [, email]]) => {
      if (had === '1') setHadAccount(true);
      if (email) setLastEmail(email);
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email ?? '';
        setAuthUser({ email });
        // Persiste que já teve conta
        AsyncStorage.multiSet([['hadAccount', '1'], ['lastEmail', email]]);
        setHadAccount(true);
        setLastEmail(email);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email ?? '';
        setAuthUser({ email });
        AsyncStorage.multiSet([['hadAccount', '1'], ['lastEmail', email]]);
        setHadAccount(true);
        setLastEmail(email);
      } else {
        setAuthUser(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleBackup = async () => {
    if (!authUser) {
      router.push('/auth/login');
      return;
    }
    setSyncLoading(true);
    try {
      await uploadToSupabase();
      Alert.alert(t('profile.settings.backupSuccess'), t('profile.settings.backupSuccessMsg'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('profile.settings.backupError'));
    } finally {
      setSyncLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!authUser) {
      router.push('/auth/login');
      return;
    }
    Alert.alert(
      t('profile.settings.restoreTitle'),
      t('profile.settings.restoreMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.settings.restoreBtn'),
          style: 'destructive',
          onPress: async () => {
            setSyncLoading(true);
            try {
              await downloadFromSupabase();
              Alert.alert(t('profile.settings.restoreSuccess'), t('profile.settings.restoreSuccessMsg'));
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message || t('profile.settings.restoreError'));
            } finally {
              setSyncLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(t('profile.settings.logoutTitle'), t('profile.settings.logoutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.settings.logoutBtn'),
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setAuthUser(null);
        },
      },
    ]);
  };

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
            secureGet('userProfile'),
            AsyncStorage.getItem('reminders'),
            AsyncStorage.getItem('vaccinations'),
            AsyncStorage.getItem('weightRecords'),
            AsyncStorage.getItem('streakData'),
          ]);

          const parsedPets: Pet[] = pJSON ? JSON.parse(pJSON) : [];
          const parsedReminders: Reminder[] = rJSON ? JSON.parse(rJSON) : [];
          const parsedVaccines: VaccineRecord[] = vJSON ? JSON.parse(vJSON) : [];

          const parsedWeightRecords: WeightRecord[] = weightJSON ? JSON.parse(weightJSON) : [];
          const parsedStreak: StreakData = streakJSON
            ? JSON.parse(streakJSON)
            : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 };

          setPets(parsedPets);
          setProfile(profJSON ? JSON.parse(profJSON) : null);
          setReminders(parsedReminders);
          setVaccines(parsedVaccines);
          setWeightRecords(parsedWeightRecords);
          setStreak(parsedStreak);

          // Checar e desbloquear conquistas
          const newlyUnlocked = await checkAndUnlockAchievements({
            pets: parsedPets,
            reminders: parsedReminders,
            vaccines: parsedVaccines,
            weightRecords: parsedWeightRecords,
            streak: parsedStreak,
          });
          if (newlyUnlocked.length > 0) {
            setUnlockedAchievementId(newlyUnlocked[0]);
          }
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
          if (__DEV__) console.error('Erro ao carregar perfil:', e);
        }
      };
      load();
    }, [])
  );

  // ── Urgência ──────────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueReminders = reminders.filter(r => {
    if (r.completed) return false;
    const d = parseDate(r.date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  const todayReminders = reminders.filter(r => {
    if (r.completed) return false;
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

  const markReminderDone = async (reminderId: string) => {
    const updated = reminders.map(r =>
      r.id === reminderId ? { ...r, completed: true, completedAt: new Date().toISOString() } : r
    );
    setReminders(updated);
    await AsyncStorage.setItem('reminders', JSON.stringify(updated));
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

  const loadExportData = async () => {
    const [pJSON, rJSON, vJSON, profJSON] = await Promise.all([
      AsyncStorage.getItem('pets'),
      AsyncStorage.getItem('reminders'),
      AsyncStorage.getItem('vaccinations'),
      secureGet('userProfile'),
    ]);
    return {
      profile: profJSON ? JSON.parse(profJSON) : null,
      pets: (pJSON ? JSON.parse(pJSON) : []) as Pet[],
      reminders: (rJSON ? JSON.parse(rJSON) : []) as Reminder[],
      vaccines: (vJSON ? JSON.parse(vJSON) : []) as VaccineRecord[],
    };
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const exportAsPDF = async () => {
    try {
      const data = await loadExportData();
      const now = new Date().toLocaleDateString('pt-BR');

      const petsSection = data.pets.map(p => {
        const petReminders = data.reminders.filter(r => r.petId === p.id);
        const petVaccines = data.vaccines.filter(v => v.petId === p.id);
        const remindersRows = petReminders.length
          ? petReminders.map(r => `<tr><td>${escapeHtml(r.description)}</td><td>${escapeHtml(r.date ?? '—')}</td><td>${r.completed ? '✓' : '—'}</td></tr>`).join('')
          : `<tr><td colspan="3" style="color:#999">Nenhum lembrete</td></tr>`;
        const vaccinesRows = petVaccines.length
          ? petVaccines.map(v => `<tr><td>${escapeHtml(v.vaccineName)}</td><td>${escapeHtml(v.dateAdministered)}</td><td>${escapeHtml(v.nextDueDate ?? '—')}</td></tr>`).join('')
          : `<tr><td colspan="3" style="color:#999">Nenhuma vacina</td></tr>`;
        return `
          <div class="pet-card">
            <h2>${escapeHtml(p.name)}</h2>
            <p class="meta">${escapeHtml([p.species, p.breed].filter(Boolean).join(' · '))}</p>
            <h3>Lembretes</h3>
            <table><tr><th>Título</th><th>Data</th><th>Feito</th></tr>${remindersRows}</table>
            <h3>Vacinas</h3>
            <table><tr><th>Vacina</th><th>Data</th><th>Próxima</th></tr>${vaccinesRows}</table>
          </div>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:24px;color:#222}
  h1{color:#4CAF50;border-bottom:2px solid #4CAF50;padding-bottom:8px}
  h2{color:#2196F3;margin-top:0}
  h3{color:#555;font-size:14px;margin-bottom:4px}
  .pet-card{background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px;page-break-inside:avoid}
  .meta{color:#777;font-size:13px;margin-top:-8px;margin-bottom:12px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th{background:#eee;text-align:left;padding:6px 8px;font-size:12px}
  td{padding:5px 8px;font-size:12px;border-bottom:1px solid #eee}
  .footer{color:#aaa;font-size:11px;text-align:center;margin-top:24px}
</style>
</head><body>
<h1>Zupet — Meus Dados</h1>
<p>Exportado em ${now} · ${data.pets.length} pet(s)</p>
${petsSection || '<p>Nenhum pet cadastrado.</p>'}
<div class="footer">Zupet · Exportado em ${now}</div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Zupet — Meus Dados',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch {
      Alert.alert(t('common.error'), t('profile.settings.exportError'));
    }
  };

  const exportAsJSON = async () => {
    try {
      const data = await loadExportData();
      const exportObj = { exportedAt: new Date().toISOString(), ...data };
      const json = JSON.stringify(exportObj, null, 2);
      await Share.share({ message: json, title: 'Zupet — Backup' });
    } catch {
      Alert.alert(t('common.error'), t('profile.settings.exportError'));
    }
  };

  const handleExportData = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(t('common.attention'), t('profile.settings.exportWebUnsupported'));
      return;
    }
    const biometricAvailable = await isBiometricAvailable();
    if (biometricAvailable) {
      const authed = await requestBiometricAuth(t('profile.settings.exportBiometricPrompt'));
      if (!authed) return;
    } else {
      // Sem biometria: pede confirmação explícita antes de exportar dados sensíveis
      const confirmed = await new Promise<boolean>(resolve =>
        Alert.alert(
          t('profile.settings.exportPrivacyTitle'),
          t('profile.settings.exportPrivacyMsg'),
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('common.confirm'), onPress: () => resolve(true) },
          ]
        )
      );
      if (!confirmed) return;
    }
    // Aviso de privacidade antes de exportar
    Alert.alert(
      t('profile.settings.exportPrivacyTitle'),
      t('profile.settings.exportPrivacyMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.settings.exportContinue'),
          onPress: () => Alert.alert(
            t('profile.settings.exportData'),
            t('profile.settings.exportChoose'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('profile.settings.exportPDF'), onPress: exportAsPDF },
              { text: t('profile.settings.exportJSON'), onPress: exportAsJSON },
            ]
          ),
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      t('profile.settings.clearDataTitle'),
      t('profile.settings.clearDataMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive', onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'pets', 'reminders', 'vaccinations', 'userProfile',
                'weightRecords', 'streakData', 'achievements', 'feedingRecords',
                'medications', 'diaryEntries', 'petDocuments', 'petPhotos',
              ]);
              setPets([]);
              setReminders([]);
              setVaccines([]);
              setProfile(null);
              setUnlockedAchievements([]);
            } catch {
              Alert.alert(t('common.error'), t('profile.settings.clearDataError'));
            }
          },
        },
      ]
    );
  };

  // ── Conquistas ────────────────────────────────────────────────────────────
  const unlockedIds = unlockedAchievements.map(a => a.id);
  const unlockedCount = unlockedAchievements.length;

  const displayName = profile?.name || t('profile.yourName');
  const initials = getInitials(displayName);

  return (
    <View style={[styles.rootWrap, { backgroundColor: colors.background }]}>
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('profile.title')}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setSettingsVisible(true)}>
          <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Seção do usuário ── */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.userAvatar, { backgroundColor: Theme.primary + '22' }]}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <Text style={[styles.userName, { color: colors.text.primary }]}>{displayName}</Text>
          {!!profile?.experience && (
            <View style={[styles.expBadge, { backgroundColor: Theme.primary + '18' }]}>
              <MaterialCommunityIcons
                name={profile.experience === 'beginner' ? 'sprout' : profile.experience === 'intermediate' ? 'paw' : 'trophy-outline'}
                size={13}
                color={Theme.primary}
              />
              <Text style={[styles.expBadgeText, { color: Theme.primary }]}>
                {t(`editProfile.exp.${profile.experience}`)}
              </Text>
            </View>
          )}
          {(!!profile?.city || !!profile?.state) && (
            <View style={styles.profileMetaRow}>
              <Ionicons name="location-outline" size={12} color={colors.text.light} />
              <Text style={[styles.profileMetaText, { color: colors.text.secondary }]}>
                {' '}{[profile?.city, profile?.state].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          {!!profile?.bio && (
            <Text style={[styles.userBio, { color: colors.text.secondary }]} numberOfLines={2}>
              {profile.bio}
            </Text>
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="create-outline" size={14} color="#fff" />
            <Text style={styles.editBtnText}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Estatísticas ── */}
        <View style={styles.miniStatsRow}>
          {[
            { value: pets.length, label: 'Pets', color: '#40E0D0' },
            { value: reminders.length, label: 'Lembretes', color: '#FF9800' },
            { value: vaccines.length, label: 'Vacinas', color: '#4CAF50' },
            { value: unlockedCount, label: 'Conquistas', color: '#9C27B0' },
          ].map(stat => (
            <View key={stat.label} style={[styles.miniStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.miniStatValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.miniStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Settings ── */}
        <View style={[styles.quickSettings, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={() => setSettingsVisible(true)}>
            <View style={[styles.settingIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="color-palette-outline" size={16} color="#2196F3" />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t('settings.theme', { defaultValue: 'Tema' })}</Text>
            <Text style={[styles.settingValue, { color: colors.text.secondary }]}>{t('settings.light', { defaultValue: 'Claro' })}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.light} />
          </TouchableOpacity>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.settingRow} onPress={() => setSettingsVisible(true)}>
            <View style={[styles.settingIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="globe-outline" size={16} color="#FF9800" />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t('settings.language', { defaultValue: 'Idioma' })}</Text>
            <Text style={[styles.settingValue, { color: colors.text.secondary }]}>Português</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.light} />
          </TouchableOpacity>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/monthly-report')}>
            <View style={[styles.settingIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="download-outline" size={16} color="#4CAF50" />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t('profile.exportData', { defaultValue: 'Exportar Dados' })}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.light} />
          </TouchableOpacity>
        </View>

        {/* ── Painel de urgência ── */}
        {hasUrgency && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('profile.attention')}</Text>
            <View style={[styles.urgencyCard, { backgroundColor: colors.surface, borderColor: Theme.danger + '40' }]}>

              {/* Resumo vacinas vencidas */}
              {overdueVaccines.length > 0 && (
                <View style={styles.urgencyRow}>
                  <View style={[styles.urgencyDot, { backgroundColor: Theme.danger }]} />
                  <Text style={[styles.urgencyText, { color: Theme.danger, fontWeight: '700' }]}>
                    {t('profile.overdueVaccines', { count: overdueVaccines.length })}
                  </Text>
                </View>
              )}

              {/* Lembretes atrasados — com botão de marcar */}
              {overdueReminders.length > 0 && (
                <>
                  <View style={[styles.urgencyRow, { paddingBottom: 4 }]}>
                    <View style={[styles.urgencyDot, { backgroundColor: Theme.danger }]} />
                    <Text style={[styles.urgencyText, { color: Theme.danger, fontWeight: '700' }]}>
                      {t('profile.overdueReminders', { count: overdueReminders.length })}
                    </Text>
                  </View>
                  {overdueReminders.slice(0, 5).map(r => {
                    const pet = pets.find(p => p.id === r.petId);
                    return (
                      <View key={r.id} style={[styles.overdueReminderRow, { borderTopColor: colors.border }]}>
                        <View style={styles.overdueReminderInfo}>
                          <Text style={[styles.overdueReminderDesc, { color: colors.text.primary }]} numberOfLines={1}>
                            {r.description}
                          </Text>
                          {pet && (
                            <Text style={[styles.overdueReminderMeta, { color: colors.text.light }]}>
                              {pet.name} · {r.date}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[styles.markDoneBtn, { backgroundColor: Theme.primary + '20' }]}
                          onPress={() => markReminderDone(r.id)}
                        >
                          <Ionicons name="checkmark" size={14} color={Theme.primary} />
                          <Text style={[styles.markDoneBtnText, { color: Theme.primary }]}>{t('profile.markDoneBtn')}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {overdueReminders.length > 5 && (
                    <View style={[styles.urgencyRow, { paddingTop: 4 }]}>
                      <Text style={[styles.urgencyText, { color: colors.text.light }]}>
                        {t('profile.overdueRemindersMore', { count: overdueReminders.length - 5 })}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Lembretes de hoje */}
              {todayReminders.length > 0 && (
                <View style={styles.urgencyRow}>
                  <View style={[styles.urgencyDot, { backgroundColor: Theme.warning }]} />
                  <Text style={[styles.urgencyText, { color: Theme.warning, fontWeight: '700' }]}>
                    {t('profile.todayReminders', { count: todayReminders.length })}
                  </Text>
                </View>
              )}

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

        {/* ── Conquistas Recentes ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {t('profile.achievements', { defaultValue: 'Conquistas Recentes' })}
            </Text>
            <TouchableOpacity onPress={() => router.push('/conquistas')}>
              <Text style={[styles.seeAllText, { color: Theme.primary }]}>{t('profile.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {unlockedAchievements.length === 0 ? (
            <View style={[styles.achEmptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="trophy-outline" size={28} color={colors.text.light} />
              <Text style={[styles.achEmptyText, { color: colors.text.secondary }]}>
                {t('profile.noAchievements', { defaultValue: 'Complete desafios para desbloquear conquistas!' })}
              </Text>
            </View>
          ) : (
            <View style={styles.achGrid}>
              {unlockedAchievements.slice(-3).reverse().map((ach) => {
                const def = ACHIEVEMENTS.find(a => a.id === ach.id);
                return (
                  <View key={ach.id} style={[styles.achCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.achIconWrap, { backgroundColor: (def?.color ?? '#40E0D0') + '20' }]}>
                      <MaterialCommunityIcons
                        name={(def?.icon ?? 'trophy') as MCIName}
                        size={24}
                        color={def?.color ?? '#40E0D0'}
                      />
                    </View>
                    <Text style={[styles.achCardName, { color: colors.text.primary }]} numberOfLines={2}>
                      {def?.title ?? ach.id}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: screenHeight * 0.8 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('profile.settings.title')}</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={26} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

              {/* ── Aparência ── */}
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary }]}>{t('profile.settings.appearance')}</Text>
              <ThemeToggle />

              {/* ── Idioma ── */}
              <View style={[styles.langRow, { backgroundColor: colors.surface }]}>
                <View style={styles.langLeft}>
                  <Ionicons name="language-outline" size={20} color={colors.text.primary} />
                  <Text style={[styles.langTitle, { color: colors.text.primary }]}>{t('profile.settings.language')}</Text>
                </View>
                <View style={[styles.langBtnGroup, { backgroundColor: colors.background }]}>
                  {([
                    { lang: 'pt-BR', flag: '🇧🇷' },
                    { lang: 'en',    flag: '🇺🇸' },
                    { lang: 'es',    flag: '🇪🇸' },
                  ] as { lang: SupportedLanguage; flag: string }[]).map(({ lang, flag }) => {
                    const active = currentLang === lang;
                    return (
                      <TouchableOpacity
                        key={lang}
                        style={[styles.langBtn, active && { backgroundColor: colors.surface }]}
                        onPress={() => handleChangeLanguage(lang)}
                      >
                        <Text style={[styles.langFlag, { opacity: active ? 1 : 0.45 }]}>{flag}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ── Notificações ── */}
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary, marginTop: 20 }]}>{t('profile.settings.notifications')}</Text>
              <TouchableOpacity
                style={[styles.modalItem, { backgroundColor: colors.background }]}
                onPress={() => { setSettingsVisible(false); Alert.alert(t('profile.settings.notifications'), t('profile.settings.manageNotifications')); }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#FF950018' }]}>
                  <Ionicons name="notifications-outline" size={20} color="#FF9500" />
                </View>
                <Text style={[styles.modalItemText, { color: colors.text.primary }]}>{t('profile.settings.manageNotifications')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
              </TouchableOpacity>

              {/* ── Conta ── */}
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary, marginTop: 20 }]}>{t('profile.settings.account')}</Text>
              <TouchableOpacity
                style={[styles.modalItem, { backgroundColor: colors.background }]}
                onPress={() => { setSettingsVisible(false); router.push('/profile/edit'); }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: Theme.primary + '18' }]}>
                  <Ionicons name="create-outline" size={20} color={Theme.primary} />
                </View>
                <Text style={[styles.modalItemText, { color: colors.text.primary }]}>{t('profile.editProfile')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalItem, { backgroundColor: colors.background, marginTop: 6 }]}
                onPress={() => {
                  setSettingsVisible(false);
                  setTimeout(() => handleExportData(), 400);
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#2196F318' }]}>
                  <Ionicons name="download-outline" size={20} color="#2196F3" />
                </View>
                <Text style={[styles.modalItemText, { color: colors.text.primary }]}>{t('profile.settings.exportData')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
              </TouchableOpacity>

              {/* ── Backup na Nuvem ── */}
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary, marginTop: 20 }]}>{t('profile.settings.cloudBackup')}</Text>

              {authUser ? (
                /* Estado 1: logado */
                <View style={[styles.modalItem, { backgroundColor: colors.background, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="cloud-done-outline" size={16} color={Theme.primary} />
                    <Text style={{ color: colors.text.secondary, fontSize: 12 }} numberOfLines={1}>{authUser.email}</Text>
                  </View>

                  {/* Status da sincronização automática */}
                  {syncStatus === 'synced' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      <Text style={{ color: '#4CAF50', fontSize: 12 }}>
                        {t('profile.settings.syncSynced')}
                        {lastSyncedAt ? ` — ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </Text>
                    </View>
                  )}
                  {syncStatus === 'syncing' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="sync-outline" size={14} color={Theme.primary} />
                      <Text style={{ color: Theme.primary, fontSize: 12 }}>{t('profile.settings.syncSyncing')}</Text>
                    </View>
                  )}
                  {(syncStatus === 'pending' || syncStatus === 'offline') && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="cloud-offline-outline" size={14} color="#FF9800" />
                      <Text style={{ color: '#FF9800', fontSize: 12 }}>{t('profile.settings.syncPending')}</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                    <TouchableOpacity
                      style={[styles.syncBtn, { backgroundColor: Theme.primary + '18', flex: 1 }]}
                      onPress={() => { setSettingsVisible(false); setTimeout(handleBackup, 400); }}
                      disabled={syncLoading}
                    >
                      <Ionicons name="cloud-upload-outline" size={16} color={Theme.primary} />
                      <Text style={[styles.syncBtnText, { color: Theme.primary }]}>
                        {syncLoading ? t('profile.settings.backupSaving') : t('profile.settings.backupBtn')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.syncBtn, { backgroundColor: '#FF980018', flex: 1 }]}
                      onPress={() => { setSettingsVisible(false); setTimeout(handleRestore, 400); }}
                      disabled={syncLoading}
                    >
                      <Ionicons name="cloud-download-outline" size={16} color="#FF9800" />
                      <Text style={[styles.syncBtnText, { color: '#FF9800' }]}>{t('profile.settings.restoreBtn')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={handleLogout}>
                    <Text style={{ color: colors.text.secondary, fontSize: 11 }}>{t('profile.settings.logoutBtn')}</Text>
                  </TouchableOpacity>
                </View>
              ) : hadAccount ? (
                /* Estado 2: já teve conta mas está deslogado */
                <View style={[styles.modalItem, { backgroundColor: colors.background, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Ionicons name="cloud-offline-outline" size={16} color="#FF9800" />
                    <Text style={{ color: '#FF9800', fontSize: 12, fontWeight: '600' }}>{t('profile.settings.disconnected')}</Text>
                  </View>
                  {lastEmail ? (
                    <Text style={{ color: colors.text.secondary, fontSize: 11 }} numberOfLines={1}>
                      {t('profile.settings.lastAccount', { email: lastEmail })}
                    </Text>
                  ) : null}
                  <Text style={{ color: colors.text.secondary, fontSize: 11, lineHeight: 16 }}>
                    {t('profile.settings.localDataSafe')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.syncBtn, { backgroundColor: Theme.primary + '18', marginTop: 4 }]}
                    onPress={() => { setSettingsVisible(false); setTimeout(() => router.push('/auth/login'), 400); }}
                  >
                    <Ionicons name="log-in-outline" size={16} color={Theme.primary} />
                    <Text style={[styles.syncBtnText, { color: Theme.primary }]}>{t('profile.settings.loginAgain')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Estado 3: nunca criou conta */
                <TouchableOpacity
                  style={[styles.modalItem, { backgroundColor: colors.background }]}
                  onPress={() => { setSettingsVisible(false); setTimeout(() => router.push({ pathname: '/auth/login', params: { mode: 'signup' } }), 400); }}
                >
                  <View style={[styles.modalItemIcon, { backgroundColor: Theme.primary + '18' }]}>
                    <Ionicons name="cloud-outline" size={20} color={Theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemText, { color: colors.text.primary }]}>{t('profile.settings.createAccount')}</Text>
                    <Text style={{ color: colors.text.secondary, fontSize: 11, marginTop: 2 }}>{t('profile.settings.createAccountDesc')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
                </TouchableOpacity>
              )}

              {/* ── Zona de Perigo ── */}
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary, marginTop: 20 }]}>{t('profile.settings.danger')}</Text>
              <TouchableOpacity
                style={[styles.modalItem, { backgroundColor: '#F4433608', borderWidth: 1, borderColor: '#F4433630' }]}
                onPress={() => {
                  setSettingsVisible(false);
                  handleClearData();
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#F4433618' }]}>
                  <Ionicons name="trash-outline" size={20} color="#F44336" />
                </View>
                <Text style={[styles.modalItemText, { color: '#F44336' }]}>{t('profile.settings.clearData')}</Text>
                <Ionicons name="chevron-forward" size={18} color="#F4433660" />
              </TouchableOpacity>

              {/* ── Sobre ── */}
              <Text style={[styles.modalSectionLabel, { color: colors.text.secondary, marginTop: 20 }]}>{t('profile.settings.about')}</Text>
              <View style={[styles.aboutCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.aboutIconCircle, { backgroundColor: Theme.primary + '18' }]}>
                  <MaterialCommunityIcons name="paw" size={18} color={Theme.primary} />
                </View>
                <Text style={[styles.aboutAppName, { color: colors.text.primary }]}>Zupet</Text>
                <Text style={[styles.aboutVersion, { color: colors.text.secondary }]}>v{Constants.expoConfig?.version ?? '1.1.0'}</Text>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AdBanner />
      <AchievementUnlockModal
        achievementId={unlockedAchievementId}
        onClose={() => setUnlockedAchievementId(null)}
      />
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrap: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerBtn: { padding: 6 },
  scrollContent: { paddingBottom: 40 },

  // Profile card
  profileCard: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  userAvatar: {
    width: 72, height: 72, borderRadius: 36,
    marginBottom: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarInitials: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userEmail: { fontSize: 13, marginBottom: 12 },
  userBio: { fontSize: 13, marginBottom: 12, textAlign: 'center' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Theme.primary,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, gap: 6,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  expBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 5,
  },
  expBadgeText: { fontSize: 11, fontWeight: '700' },
  profileMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  profileMetaText: { fontSize: 12 },

  // Quick Settings
  quickSettings: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  settingValue: { fontSize: 14, marginRight: 8 },
  settingDivider: { height: 1, marginLeft: 60 },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  addBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', marginHorizontal: -4, gap: 4 },
  miniStatsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 20 },
  miniStatCard: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', paddingVertical: 12, gap: 2,
  },
  miniStatValue: { fontSize: 20, fontWeight: '700' },
  miniStatLabel: { fontSize: 11, color: '#666666' },

  // Urgency
  urgencyCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  urgencyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9 },
  urgencyDot: { width: 7, height: 7, borderRadius: 4, marginRight: 9 },
  urgencyText: { fontSize: 13 },
  urgencyAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderTopWidth: 1,
  },
  urgencyActionText: { fontSize: 13, fontWeight: '600', marginRight: 4 },
  overdueReminderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, gap: 10,
  },
  overdueReminderInfo: { flex: 1 },
  overdueReminderDesc: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  overdueReminderMeta: { fontSize: 11 },
  markDoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  markDoneBtnText: { fontSize: 12, fontWeight: '600' },

  // Pets
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 18,
  },
  emptyCardText: { fontSize: 13, marginLeft: 10 },
  horizontalList: { paddingVertical: 4, paddingRight: 16 },
  petItem: { alignItems: 'center', marginRight: 14, width: 60 },
  petAvatarWrapper: { position: 'relative', marginBottom: 5 },
  urgencyBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#fff',
  },
  petName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  petSpecies: { fontSize: 10, textAlign: 'center', marginTop: 1 },

  // Achievements recentes
  achEmptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 16,
  },
  achEmptyText: { flex: 1, fontSize: 13, lineHeight: 18 },
  seeAllText: { fontSize: 13, fontWeight: '600' },
  achGrid: { flexDirection: 'row', gap: 10 },
  achCard: {
    flex: 1, alignItems: 'center',
    borderWidth: 1, borderRadius: 14,
    padding: 14, gap: 6,
  },
  achIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  achCardName: {
    fontSize: 10, fontWeight: '600',
    textAlign: 'center', lineHeight: 14,
  },

  // Challenge
  challengeCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 10 },
  challengeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  challengeIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  challengeDoneBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  challengeDoneBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 3 },
  challengeTitle: { fontSize: 15, fontWeight: '800', marginBottom: 5 },
  challengeDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
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
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
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
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, justifyContent: 'center' },
  syncBtnText: { fontSize: 13, fontWeight: '600' },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  langLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langTitle: { fontSize: 15, fontWeight: '500' },
  langBtnGroup: { flexDirection: 'row', borderRadius: 8, padding: 3, gap: 2 },
  langBtn: { width: 32, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  langFlag: { fontSize: 18 },

  // Modal items com ícone
  modalItemIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },

  // About card
  aboutCard: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  aboutIconCircle: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  aboutAppName: { fontSize: 14, fontWeight: '700', flex: 1 },
  aboutVersion: { fontSize: 12, fontWeight: '400' },
  aboutDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
