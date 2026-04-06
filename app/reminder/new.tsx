import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  Platform, ScrollView, TextInput,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useGoBack } from '../../hooks/useGoBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncReminders } from '../../services/syncService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Reminder, Pet, RecurrenceType } from '../../types/pet';
import { Theme, getCategoryColor } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import DatePickerInput from '../../components/DatePickerInput';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useTheme } from '../../hooks/useTheme';
import { checkAndUnlockAchievements } from '../../hooks/useAchievements';
import { autoCompleteChallenge } from '../../hooks/useChallenges';
import { useTranslation } from 'react-i18next';

type Category = 'Saúde' | 'Higiene' | 'Consulta' | 'Prevenção' | 'Outro';

const CATEGORIES: { value: Category; icon: keyof typeof Ionicons.glyphMap; label: string; color: string }[] = [
  { value: 'Saúde',     icon: 'medkit-outline',           label: 'Vacina',   color: '#40E0D0' },
  { value: 'Consulta',  icon: 'pulse-outline',            label: 'Consulta', color: '#FF9800' },
  { value: 'Higiene',   icon: 'color-filter-outline',     label: 'Remédio',  color: '#9C27B0' },
  { value: 'Prevenção', icon: 'cut-outline',              label: 'Banho',    color: '#2196F3' },
  { value: 'Outro',     icon: 'ellipse-outline',          label: 'Outro',    color: '#9E9E9E' },
];

const SUGGESTIONS: Record<Category, string[]> = {
  'Saúde':     ['Vermifugação', 'Antipulgas', 'Curativo', 'Medicação'],
  'Higiene':   ['Banho', 'Tosa', 'Corte de unhas', 'Limpeza de ouvido'],
  'Consulta':  ['Consulta de rotina', 'Retorno', 'Exame de sangue', 'Ultrassom'],
  'Prevenção': ['Antipulgas', 'Carrapatos', 'Vermífugo', 'Heartworm'],
  'Outro':     ['Passeio', 'Adestramento', 'Hotel pet', 'Comprar ração'],
};

type Template = {
  emoji: string;
  labelKey: string;
  category: Category;
  descriptionKey: string;
  recurrence: RecurrenceType;
};

const TEMPLATES: Template[] = [
  { emoji: '🛁', labelKey: 'reminder.templates.bath',      category: 'Higiene',   descriptionKey: 'reminder.templates.bathDesc',      recurrence: 'monthly'   },
  { emoji: '💊', labelKey: 'reminder.templates.deworming', category: 'Prevenção', descriptionKey: 'reminder.templates.dewormingDesc', recurrence: 'quarterly' },
  { emoji: '🩺', labelKey: 'reminder.templates.checkup',   category: 'Consulta',  descriptionKey: 'reminder.templates.checkupDesc',   recurrence: 'none'      },
  { emoji: '✂️', labelKey: 'reminder.templates.grooming',  category: 'Higiene',   descriptionKey: 'reminder.templates.groomingDesc',  recurrence: 'monthly'   },
  { emoji: '🦟', labelKey: 'reminder.templates.flea',      category: 'Prevenção', descriptionKey: 'reminder.templates.fleaDesc',      recurrence: 'monthly'   },
  { emoji: '💉', labelKey: 'reminder.templates.vaccine',   category: 'Saúde',     descriptionKey: 'reminder.templates.vaccineDesc',   recurrence: 'none'      },
  { emoji: '🦷', labelKey: 'reminder.templates.dental',    category: 'Higiene',   descriptionKey: 'reminder.templates.dentalDesc',    recurrence: 'monthly'   },
  { emoji: '🏥', labelKey: 'reminder.templates.return',    category: 'Consulta',  descriptionKey: 'reminder.templates.returnDesc',    recurrence: 'none'      },
];

export default function ReminderFormScreen() {
  const goBack  = useGoBack('/(tabs)');
  const router  = useRouter();
  const { colors } = useTheme();
  const { t }   = useTranslation();
  const params  = useLocalSearchParams();
  const petId      = params.petId as string;
  const reminderId = params.reminderId as string | undefined;
  const isEditing  = !!reminderId;

  const [pets, setPets]               = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>(petId || '');
  const [category, setCategory]       = useState<Category>('Saúde');
  const [description, setDescription] = useState('');
  const [notes, setNotes]             = useState('');
  const [date, setDate]               = useState<Date | null>(null);
  const [time, setTime]               = useState('');
  const [recurrence, setRecurrence]   = useState<RecurrenceType>('none');
  const [showSuccess, setShowSuccess] = useState(false);

  const { validateAll, getFieldError, touchField } = useFormValidation({
    description: { required: true, minLength: 3, maxLength: 200 },
  });

  // Carrega pets para o seletor
  useEffect(() => {
    AsyncStorage.getItem('pets').then(j => {
      if (j) setPets(JSON.parse(j));
    });
  }, []);

  useEffect(() => {
    if (!isEditing) {
      const prefillDesc = params.prefillDescription as string | undefined;
      const prefillCat  = params.prefillCategory   as string | undefined;
      const prefillRec  = params.prefillRecurrence as string | undefined;
      if (prefillDesc) setDescription(prefillDesc);
      if (prefillCat && CATEGORIES.some(c => c.value === prefillCat)) setCategory(prefillCat as Category);
      if (prefillRec) setRecurrence(prefillRec as RecurrenceType);
      return;
    }
    const load = async () => {
      try {
        const json = await AsyncStorage.getItem('reminders');
        const all: Reminder[] = json ? JSON.parse(json) : [];
        const r = all.find(r => r.id === reminderId);
        if (r) {
          setCategory(r.category);
          setDescription(r.description);
          const parts = r.date.split('/');
          if (parts.length === 3) {
            setDate(new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
          }
        }
      } catch (e) {
        console.error('Erro ao carregar lembrete', e);
      }
    };
    load();
  }, [reminderId, isEditing]);

  const handleDelete = async () => {
    Alert.alert(t('petDetail.deleteReminder'), t('petDetail.deleteReminderMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const json = await AsyncStorage.getItem('reminders');
            let all: Reminder[] = json ? JSON.parse(json) : [];
            const toDelete = all.find(r => r.id === reminderId);
            if (toDelete?.notificationIds && Platform.OS !== 'web') {
              try {
                const NS = await import('../../services/notificationService');
                await NS.cancelNotifications(toDelete.notificationIds);
              } catch { /* ignore */ }
            }
            all = all.filter(r => r.id !== reminderId);
            await syncReminders(all);
            goBack();
          } catch {
            Alert.alert(t('common.error'), t('reminder.deleteError'));
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    const isValid = validateAll({ description });
    if (!isValid) {
      Alert.alert(t('common.attention'), t('addPet.validationError'));
      return;
    }
    if (!date) {
      Alert.alert(t('common.attention'), t('reminder.datePlaceholder') + '.');
      return;
    }

    const effectivePetId = selectedPetId || petId;
    const formattedDate  = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

    try {
      const json = await AsyncStorage.getItem('reminders');
      const all: Reminder[] = json ? JSON.parse(json) : [];
      const duplicate = all.find(r =>
        r.petId === effectivePetId &&
        r.category === category &&
        r.description.trim().toLowerCase() === description.trim().toLowerCase() &&
        r.date === formattedDate &&
        r.id !== reminderId
      );
      if (duplicate) {
        Alert.alert(t('reminder.duplicateTitle'), t('reminder.duplicateMessage'));
        return;
      }
    } catch { /* prossegue */ }

    try {
      const json = await AsyncStorage.getItem('reminders');
      let all: Reminder[] = json ? JSON.parse(json) : [];

      const petsJSON = await AsyncStorage.getItem('pets');
      const allPets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
      const pet = allPets.find(p => p.id === effectivePetId);
      const petName = pet?.name || 'Seu pet';

      let notificationIds: string[] = [];
      if (Platform.OS !== 'web' && date > new Date()) {
        try {
          const NS = await import('../../services/notificationService');
          notificationIds = await NS.scheduleReminderNotification(
            reminderId || Date.now().toString(),
            petName, description, date, category, effectivePetId
          );
        } catch { /* notif opcional */ }
      }

      if (isEditing) {
        const old = all.find(r => r.id === reminderId);
        if (old?.notificationIds && Platform.OS !== 'web') {
          try {
            const NS = await import('../../services/notificationService');
            await NS.cancelNotifications(old.notificationIds);
          } catch { /* ignore */ }
        }
        all = all.map(r =>
          r.id === reminderId
            ? { ...r, category, description, date: formattedDate, notificationIds }
            : r
        );
      } else {
        const newId = Date.now().toString();
        all.push({ id: newId, petId: effectivePetId, category, description, date: formattedDate, notificationIds, recurrence });

        if (recurrence !== 'none') {
          const daysMap: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90 };
          const interval = daysMap[recurrence];
          const maxDate  = new Date();
          maxDate.setMonth(maxDate.getMonth() + 6);
          let nextDate = new Date(date);
          for (let i = 0; i < 24; i++) {
            nextDate = new Date(nextDate);
            nextDate.setDate(nextDate.getDate() + interval);
            if (nextDate > maxDate) break;
            const nd = `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`;
            let recurNotifIds: string[] = [];
            if (Platform.OS !== 'web' && nextDate > new Date()) {
              try {
                const NS = await import('../../services/notificationService');
                recurNotifIds = await NS.scheduleReminderNotification(
                  Date.now().toString() + i, petName, description, nextDate, category, effectivePetId
                );
              } catch { /* ignore */ }
            }
            all.push({ id: Date.now().toString() + '_r' + i, petId: effectivePetId, category, description, date: nd, notificationIds: recurNotifIds, recurrence: 'none' });
          }
        }
      }

      await syncReminders(all);

      const [petsJ, vacJ, weightJ, streakJ] = await Promise.all([
        AsyncStorage.getItem('pets'),
        AsyncStorage.getItem('vaccinations'),
        AsyncStorage.getItem('weightRecords'),
        AsyncStorage.getItem('streakData'),
      ]);
      await checkAndUnlockAchievements({
        pets: petsJ ? JSON.parse(petsJ) : [],
        reminders: all,
        vaccines: vacJ ? JSON.parse(vacJ) : [],
        weightRecords: weightJ ? JSON.parse(weightJ) : [],
        streak: streakJ ? JSON.parse(streakJ) : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 },
      });
      await autoCompleteChallenge('register_reminder');

      setShowSuccess(true);
      setTimeout(() => { try { goBack(); } catch (e) { console.error('nav error:', e); } }, 1800);
    } catch (err) {
      console.error('Erro ao salvar lembrete:', err);
      Alert.alert(t('common.error'), t('reminder.saveError'));
    }
  };

  const applyTemplate = (tpl: Template) => {
    setCategory(tpl.category);
    setDescription(t(tpl.descriptionKey));
    setRecurrence(tpl.recurrence);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {isEditing ? t('reminder.editTitle') : t('reminder.newTitle')}
        </Text>
        {isEditing ? (
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Selecionar Pet */}
        {pets.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
              {t('common.selectPet')}
            </Text>
            <View style={styles.petRow}>
              {pets.map(p => {
                const selected = (selectedPetId || petId) === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.petChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selected && { backgroundColor: Theme.primary + '20', borderColor: Theme.primary },
                    ]}
                    onPress={() => setSelectedPetId(p.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.petEmoji}>
                      {p.species === 'Cachorro' ? '🐕' : p.species === 'Gato' ? '🐈' : p.species === 'Pássaro' ? '🐦' : '🐾'}
                    </Text>
                    <Text style={[
                      styles.petName,
                      { color: selected ? Theme.primary : colors.text.secondary },
                      selected && { fontWeight: '700' },
                    ]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Tipo de Lembrete — 4 chips em linha, ícone + label vertical */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
            {t('reminder.category')}
          </Text>
          <View style={styles.typeGrid}>
            {CATEGORIES.map(({ value, icon, label, color }) => {
              const selected = category === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.typeChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selected && { backgroundColor: color + '20', borderColor: color },
                  ]}
                  onPress={() => setCategory(value)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={icon} size={22} color={selected ? color : colors.text.light} />
                  <Text style={[
                    styles.typeLabel,
                    { color: selected ? color : colors.text.secondary },
                    selected && { fontWeight: '700' },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Título */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
            {t('reminder.descLabel')}{' '}
            <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <View style={[
            styles.inputRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
            !!getFieldError('description') && { borderColor: colors.danger },
          ]}>
            <Ionicons name="pencil-outline" size={18} color={colors.text.light} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.text.primary }]}
              placeholder={t('reminder.descPlaceholder')}
              placeholderTextColor={colors.text.light}
              value={description}
              onChangeText={setDescription}
              onBlur={() => touchField('description')}
            />
          </View>
          {!!getFieldError('description') && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{getFieldError('description')}</Text>
          )}
          {/* Sugestões rápidas */}
          <View style={styles.suggestionsRow}>
            {SUGGESTIONS[category].map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.suggestionChip,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  description === s && { borderColor: Theme.primary, backgroundColor: Theme.primary + '15' },
                ]}
                onPress={() => setDescription(s)}
              >
                <Text style={[
                  styles.suggestionText,
                  { color: colors.text.secondary },
                  description === s && { color: Theme.primary, fontWeight: '700' },
                ]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data */}
        <View style={styles.fieldGroup}>
          <DatePickerInput
            label={t('reminder.dateLabel')}
            value={date}
            onChange={setDate}
            placeholder={t('reminder.datePlaceholder')}
          />
        </View>

        {/* Hora (opcional) */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
            {t('reminder.timeLabel') || 'Hora (opcional)'}
          </Text>
          <View style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.notesText, { color: colors.text.primary }]}
              placeholder={t('reminder.timePlaceholder') || 'Ex: 14:30'}
              placeholderTextColor={colors.text.light}
              value={time}
              onChangeText={setTime}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
        </View>

        {/* Observações */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
            {t('reminder.notesLabel') || 'Observações (opcional)'}
          </Text>
          <View style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.notesText, { color: colors.text.primary }]}
              placeholder={t('reminder.notesPlaceholder') || 'Adicionar notas...'}
              placeholderTextColor={colors.text.light}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Repetir lembrete — toggle row */}
        {!isEditing && (
          <TouchableOpacity
            style={[styles.repeatRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setRecurrence(recurrence === 'none' ? 'monthly' : 'none')}
            activeOpacity={0.8}
          >
            <View style={styles.repeatLeft}>
              <Ionicons name="repeat" size={18} color={Theme.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.repeatLabel, { color: colors.text.primary }]}>
                {t('reminder.repeatLabel')}
              </Text>
            </View>
            <View style={[
              styles.toggleTrack,
              { backgroundColor: recurrence !== 'none' ? Theme.primary : colors.border },
            ]}>
              <View style={[
                styles.toggleThumb,
                { transform: [{ translateX: recurrence !== 'none' ? 20 : 2 }] },
              ]} />
            </View>
          </TouchableOpacity>
        )}

        {/* Info notificação */}
        {!!date && Platform.OS !== 'web' && date > new Date() && (
          <View style={[styles.infoBox, { backgroundColor: Theme.info + '15', borderColor: Theme.info + '40', marginTop: 20 }]}>
            <Ionicons name="notifications-outline" size={16} color={Theme.info} />
            <Text style={[styles.infoText, { color: Theme.info }]}>{t('reminder.infoNotification')}</Text>
          </View>
        )}

        {/* Marcar como concluído — só ao editar */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.completeBtn, { borderColor: Theme.primary }]}
            onPress={async () => {
              try {
                const json = await AsyncStorage.getItem('reminders');
                let all: Reminder[] = json ? JSON.parse(json) : [];
                const current = all.find(r => r.id === reminderId);
                all = all.map(r =>
                  r.id === reminderId
                    ? { ...r, completed: true, completedAt: new Date().toISOString() }
                    : r
                );
                await syncReminders(all);
                setShowSuccess(true);

                // Se for categoria Saúde, oferecer registrar vacina aplicada
                if (current?.category === 'Saúde') {
                  setTimeout(() => {
                    Alert.alert(
                      '💉 Registrar vacina?',
                      `Deseja registrar "${current.description}" no histórico de vacinas do pet?`,
                      [
                        {
                          text: 'Não',
                          style: 'cancel',
                          onPress: () => { try { goBack(); } catch { /* ignore */ } },
                        },
                        {
                          text: 'Registrar vacina',
                          onPress: () => {
                            try {
                              router.replace({
                                pathname: '/vaccines/new',
                                params: {
                                  petId: current.petId,
                                  prefillName: current.description,
                                },
                              });
                            } catch { goBack(); }
                          },
                        },
                      ]
                    );
                  }, 1800);
                } else {
                  setTimeout(() => { try { goBack(); } catch { /* ignore */ } }, 1800);
                }
              } catch {
                Alert.alert(t('common.error'), t('reminder.saveError'));
              }
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={Theme.primary} />
            <Text style={[styles.completeBtnText, { color: Theme.primary }]}>Marcar como concluído</Text>
          </TouchableOpacity>
        )}

        {/* Botão salvar */}
        <AnimatedButton style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>
            {isEditing ? t('reminder.updateBtn') : t('reminder.saveBtn')}
          </Text>
        </AnimatedButton>

      </ScrollView>

      <SuccessAnimation visible={showSuccess} onAnimationEnd={() => setShowSuccess(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' },

  // Scroll
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Field group
  fieldGroup: { marginBottom: 20 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  errorText:   { fontSize: 12, marginTop: 4, marginLeft: 2 },

  // Pet selector — chips em linha
  petRow:  { flexDirection: 'row', gap: 10 },
  petChip: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  petEmoji: { fontSize: 18 },
  petName:  { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Tipo de lembrete — 4 colunas, ícone + label vertical, height 72
  typeGrid: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1,
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: 14, padding: 0 },

  // Sugestões
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionText: { fontSize: 12 },

  // Notas
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 80,
  },
  notesText: { fontSize: 14, padding: 0 },

  // Repetir toggle row
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  repeatLeft:  { flexDirection: 'row', alignItems: 'center' },
  repeatLabel: { fontSize: 14, fontWeight: '500' },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, marginLeft: 8, lineHeight: 18 },

  // Botão salvar
  saveBtn: {
    height: 52,
    backgroundColor: Theme.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 14, marginTop: 12,
  },
  completeBtnText: { fontSize: 16, fontWeight: '600' },
});
