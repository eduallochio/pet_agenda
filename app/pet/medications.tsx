import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, TextInput, Switch, Modal, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncMedications } from '../../services/syncService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useGoBack } from '../../hooks/useGoBack';
import { Shadows } from '../../constants/Shadows';
import { MedicationRecord } from '../../types/pet';
import DatePickerInput from '../../components/DatePickerInput';
import { useTranslation } from 'react-i18next';

const MED_COLOR = '#E91E63';
const STORAGE_KEY = 'petMedications';

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}


type FormState = {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date | null;
  endDate: Date | null;
  vet: string;
  note: string;
  continuous: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  dosage: '',
  frequency: '',
  startDate: null,
  endDate: null,
  vet: '',
  note: '',
  continuous: false,
};

export default function MedicationsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const goBack = useGoBack('/');
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [petId])
  );

  const loadMedications = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const all: MedicationRecord[] = json ? JSON.parse(json) : [];
      setMedications(all.filter(m => m.petId === petId));
    } catch {
      /* silently fail */
    }
  };

  const saveMedication = async () => {
    if (!form.name.trim() || !form.dosage.trim() || !form.frequency.trim() || !form.startDate) {
      Alert.alert(t('common.attention'), t('medications.saveError'));
      return;
    }

    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const all: MedicationRecord[] = json ? JSON.parse(json) : [];

      const newMed: MedicationRecord = {
        id: Date.now().toString(),
        petId: petId as string,
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency.trim(),
        startDate: formatDate(form.startDate),
        endDate: !form.continuous && form.endDate ? formatDate(form.endDate) : undefined,
        vet: form.vet.trim() || undefined,
        note: form.note.trim() || undefined,
        active: true,
      };

      all.push(newMed);
      await syncMedications(all);
      setMedications(all.filter(m => m.petId === petId));
      setModalVisible(false);
      setForm(EMPTY_FORM);
    } catch {
      Alert.alert(t('common.error'), t('medications.saveError'));
    }
  };

  const markDone = async (id: string) => {
    Alert.alert(
      t('medications.markDone'),
      undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              const json = await AsyncStorage.getItem(STORAGE_KEY);
              const all: MedicationRecord[] = json ? JSON.parse(json) : [];
              const updated = all.map(m => m.id === id ? { ...m, active: false } : m);
              await syncMedications(updated);
              setMedications(updated.filter(m => m.petId === petId));
            } catch {
              Alert.alert(t('common.error'), t('medications.saveError'));
            }
          },
        },
      ]
    );
  };

  const deleteMedication = async (id: string) => {
    Alert.alert(
      t('medications.deleteTitle'),
      t('medications.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const json = await AsyncStorage.getItem(STORAGE_KEY);
              const all: MedicationRecord[] = json ? JSON.parse(json) : [];
              const updated = all.filter(m => m.id !== id);
              await syncMedications(updated);
              setMedications(updated.filter(m => m.petId === petId));
            } catch {
              Alert.alert(t('common.error'), t('medications.saveError'));
            }
          },
        },
      ]
    );
  };

  const active = medications.filter(m => m.active);
  const history = medications.filter(m => !m.active);

  const MedCard = ({ item }: { item: MedicationRecord }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, ...Shadows.small }]}
      onLongPress={() => {
        Alert.alert(
          item.name,
          undefined,
          [
            item.active ? { text: t('medications.markDone'), onPress: () => markDone(item.id) } : null,
            { text: t('medications.deleteTitle'), style: 'destructive', onPress: () => deleteMedication(item.id) },
            { text: t('common.cancel'), style: 'cancel' },
          ].filter(Boolean) as any
        );
      }}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: MED_COLOR + '18' }]}>
          <Ionicons name="medical" size={20} color={MED_COLOR} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardName, { color: colors.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.cardSub, { color: colors.text.secondary }]}>
            {item.dosage} · {item.frequency}
          </Text>
        </View>
        <View style={[
          styles.badge,
          { backgroundColor: item.active ? '#E8F5E9' : '#F5F5F5' }
        ]}>
          <Text style={[styles.badgeText, { color: item.active ? '#388E3C' : '#757575' }]}>
            {item.active ? t('medications.statusActive') : t('medications.statusDone')}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.text.light} style={{ marginRight: 4 }} />
          <Text style={[styles.detailText, { color: colors.text.secondary }]}>
            {t('medications.startDateLabel')}: {item.startDate}
            {item.endDate ? `  →  ${item.endDate}` : ''}
          </Text>
        </View>
        {!!item.vet && (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={13} color={colors.text.light} style={{ marginRight: 4 }} />
            <Text style={[styles.detailText, { color: colors.text.secondary }]}>{item.vet}</Text>
          </View>
        )}
        {!!item.note && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={13} color={colors.text.light} style={{ marginRight: 4 }} />
            <Text style={[styles.detailText, { color: colors.text.secondary }]} numberOfLines={2}>{item.note}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {t('medications.title')}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active treatments */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionDot, { backgroundColor: MED_COLOR }]} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {t('medications.active')}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.text.secondary }]}>
              ({active.length})
            </Text>
          </View>
          {active.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface, ...Shadows.small }]}>
              <Ionicons name="medical-outline" size={32} color={colors.text.light} />
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('medications.empty')}</Text>
              <Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>{t('medications.emptyMsg')}</Text>
            </View>
          ) : (
            active.map(item => <MedCard key={item.id} item={item} />)
          )}
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionDot, { backgroundColor: '#9E9E9E' }]} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                {t('medications.history')}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.text.secondary }]}>
                ({history.length})
              </Text>
            </View>
            {history.map(item => <MedCard key={item.id} item={item} />)}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: MED_COLOR }]}
        onPress={() => { setForm(EMPTY_FORM); setModalVisible(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {t('medications.add')}
              </Text>
              <View style={styles.headerBtn} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name */}
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="medical" size={18} color={MED_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder={t('medications.namePlaceholder')}
                  placeholderTextColor={colors.text.light}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                />
              </View>

              {/* Dosage */}
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="flask" size={18} color={MED_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder={t('medications.dosagePlaceholder')}
                  placeholderTextColor={colors.text.light}
                  value={form.dosage}
                  onChangeText={v => setForm(f => ({ ...f, dosage: v }))}
                />
              </View>

              {/* Frequency */}
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="time-outline" size={18} color={MED_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder={t('medications.frequencyPlaceholder')}
                  placeholderTextColor={colors.text.light}
                  value={form.frequency}
                  onChangeText={v => setForm(f => ({ ...f, frequency: v }))}
                />
              </View>

              {/* Start date */}
              <DatePickerInput
                label={t('medications.startDateLabel')}
                value={form.startDate}
                onChange={d => setForm(f => ({ ...f, startDate: d }))}
                placeholder={t('medications.startDateLabel')}
              />

              {/* Continuous toggle */}
              <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.toggleLabel, { color: colors.text.primary }]}>
                  {t('medications.continuous')}
                </Text>
                <Switch
                  value={form.continuous}
                  onValueChange={v => setForm(f => ({ ...f, continuous: v }))}
                  trackColor={{ false: colors.border, true: MED_COLOR + '80' }}
                  thumbColor={form.continuous ? MED_COLOR : '#fff'}
                />
              </View>

              {/* End date (conditional) */}
              {!form.continuous && (
                <DatePickerInput
                  label={t('medications.endDateLabel')}
                  value={form.endDate}
                  onChange={d => setForm(f => ({ ...f, endDate: d }))}
                  placeholder={t('medications.endDateLabel')}
                />
              )}

              {/* Vet */}
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="person-outline" size={18} color={colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder={t('medications.vetPlaceholder')}
                  placeholderTextColor={colors.text.light}
                  value={form.vet}
                  onChangeText={v => setForm(f => ({ ...f, vet: v }))}
                />
              </View>

              {/* Note */}
              <View style={[styles.inputWrap, styles.textAreaWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text.primary }]}
                  placeholder={t('medications.notePlaceholder')}
                  placeholderTextColor={colors.text.light}
                  value={form.note}
                  onChangeText={v => setForm(f => ({ ...f, note: v }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: MED_COLOR }]}
                onPress={saveMedication}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 100 },

  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  sectionCount: { fontSize: 14 },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitleWrap: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 1 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDetails: { marginTop: 4, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailText: { fontSize: 13, flex: 1 },

  emptyBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptyMsg: { fontSize: 13, textAlign: 'center' },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ default: { shadowColor: '#E91E63', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8 }, web: {} }),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({ default: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 12 }, web: {} }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 20, paddingBottom: 40, gap: 12 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  textAreaWrap: { alignItems: 'flex-start', paddingVertical: 12 },
  textArea: { height: 72 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleLabel: { flex: 1, fontSize: 14, marginRight: 12 },

  saveBtn: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Platform.select({ default: { shadowColor: '#E91E63', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }, web: {} }),
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
