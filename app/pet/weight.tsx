import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncWeightRecords } from '../../services/syncService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { WeightRecord } from '../../types/pet';
import DatePickerInput from '../../components/DatePickerInput';
import { useTranslation } from 'react-i18next';
import { getIdealWeight } from '../../constants/idealWeight';

function parseDate(s: string): Date {
  const p = s.split('/');
  if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(s);
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Mini gráfico de barras
function WeightChart({ records, species }: { records: WeightRecord[]; species?: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  if (records.length < 2) return null;

  const sorted = [...records].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const last8 = sorted.slice(-8);
  const weights = last8.map(r => r.weight);
  const ideal = species ? getIdealWeight(species) : null;
  const allVals = ideal ? [...weights, ideal.min, ideal.max] : weights;
  const min = Math.min(...allVals) * 0.93;
  const max = Math.max(...allVals) * 1.07;
  const range = max - min || 1;
  const BAR_MAX_H = 80;

  const idealMid = ideal ? (ideal.min + ideal.max) / 2 : null;
  const idealMinPct = ideal ? ((ideal.min - min) / range) * BAR_MAX_H : null;
  const idealMaxPct = ideal ? ((ideal.max - min) / range) * BAR_MAX_H : null;

  return (
    <View style={[chartStyles.container, { backgroundColor: colors.surface, ...Shadows.small }]}>
      <Text style={[chartStyles.title, { color: colors.text.primary }]}>{t('weight.chartTitle')}</Text>
      <View style={[chartStyles.bars, { position: 'relative' }]}>
        {/* Faixa ideal sombreada */}
        {ideal && idealMinPct !== null && idealMaxPct !== null && (
          <View
            pointerEvents="none"
            style={[chartStyles.idealBand, {
              bottom: idealMinPct + 8,
              height: Math.max(idealMaxPct - idealMinPct, 2),
            }]}
          />
        )}
        {last8.map((r, i) => {
          const h = ((r.weight - min) / range) * BAR_MAX_H + 8;
          const isLast = i === last8.length - 1;
          const inIdeal = ideal ? r.weight >= ideal.min && r.weight <= ideal.max : null;
          const barColor = inIdeal === true ? '#4CAF50' : inIdeal === false ? '#FF9800' : (isLast ? Theme.primary : Theme.primary + '50');
          return (
            <View key={r.id} style={chartStyles.barCol}>
              <Text style={[chartStyles.barValue, { color: isLast ? Theme.primary : colors.text.secondary }]}>
                {r.weight}
              </Text>
              <View style={[chartStyles.bar, { height: h, backgroundColor: barColor }]} />
              <Text style={[chartStyles.barDate, { color: colors.text.light }]} numberOfLines={1}>
                {r.date.slice(0, 5)}
              </Text>
            </View>
          );
        })}
      </View>
      {/* Legenda peso ideal */}
      {ideal && (
        <View style={chartStyles.idealLegend}>
          <View style={[chartStyles.idealDot, { backgroundColor: '#4CAF5060' }]} />
          <Text style={[chartStyles.idealText, { color: colors.text.secondary }]}>
            {t('weight.idealRange', { min: ideal.min, max: ideal.max })}
          </Text>
        </View>
      )}
      {weights.length >= 2 && (() => {
        const diff = weights[weights.length - 1] - weights[weights.length - 2];
        const sign = diff > 0 ? '+' : '';
        const color = diff > 0 ? '#FF9800' : diff < 0 ? '#4CAF50' : colors.text.secondary;
        return (
          <Text style={[chartStyles.trend, { color }]}>
            {t('weight.chartTrend', { diff: `${sign}${diff.toFixed(2)}` })}
          </Text>
        );
      })()}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { borderRadius: 16, padding: 16, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  bar: { width: '60%', borderRadius: 4, minHeight: 8 },
  barDate: { fontSize: 9, marginTop: 3 },
  trend: { fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  idealBand: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: '#4CAF5018', borderRadius: 4,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#4CAF5040',
  },
  idealLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  idealDot: { width: 12, height: 12, borderRadius: 3 },
  idealText: { fontSize: 11, fontWeight: '600' },
});

export default function WeightScreen() {
  const { id: petId, name: petName, species: petSpecies } = useLocalSearchParams<{ id: string; name: string; species: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [weightAlert, setWeightAlert] = useState<{
    pct: number;
    isLoss: boolean;
    severity: 'warning' | 'danger';
  } | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const computeAlert = useCallback((recs: WeightRecord[]) => {
    if (recs.length < 2) { setWeightAlert(null); return; }
    const sorted = [...recs].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
    const latest = sorted[sorted.length - 1];
    const cutoff = new Date(parseDate(latest.date).getTime() - 30 * 24 * 60 * 60 * 1000);
    const baseline = sorted.find(r => parseDate(r.date).getTime() >= cutoff.getTime());
    if (!baseline || baseline.id === latest.id) { setWeightAlert(null); return; }
    const pct = Math.abs((latest.weight - baseline.weight) / baseline.weight) * 100;
    if (pct < 10) { setWeightAlert(null); return; }
    setWeightAlert({
      pct: Math.round(pct * 10) / 10,
      isLoss: latest.weight < baseline.weight,
      severity: pct > 15 ? 'danger' : 'warning',
    });
    setAlertDismissed(false);
  }, []);

  const load = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem('weightRecords');
      const all: WeightRecord[] = json ? JSON.parse(json) : [];
      const filtered = all.filter(r => r.petId === petId).sort((a, b) =>
        parseDate(b.date).getTime() - parseDate(a.date).getTime()
      );
      setRecords(filtered);
      computeAlert(filtered);
    } catch { /* silent */ }
  }, [petId, computeAlert]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    const w = parseFloat(weight.replace(',', '.'));
    if (isNaN(w) || w <= 0 || w > 999) {
      Alert.alert(t('common.attention'), t('weight.alertInvalidWeight'));
      return;
    }
    if (!date) {
      Alert.alert(t('common.attention'), t('weight.alertSelectDate'));
      return;
    }
    try {
      const json = await AsyncStorage.getItem('weightRecords');
      const all: WeightRecord[] = json ? JSON.parse(json) : [];
      const newRecord: WeightRecord = {
        id: Date.now().toString(),
        petId: petId!,
        weight: Math.round(w * 100) / 100,
        date: formatDate(date),
        note: note.trim() || undefined,
      };
      const isFirst = all.filter(r => r.petId === petId).length === 0;
      all.push(newRecord);
      await syncWeightRecords(all);
      setWeight('');
      setNote('');
      setDate(new Date());
      setAdding(false);
      load();
      if (isFirst) {
        Alert.alert(
          t('weight.suggestReminderTitle'),
          t('weight.suggestReminderMsg', { name: petName }),
          [
            { text: t('weight.suggestReminderNo'), style: 'cancel' },
            {
              text: t('weight.suggestReminderYes'),
              onPress: () => router.push({
                pathname: '/reminder/new',
                params: { petId, prefillDescription: t('weight.suggestReminderDesc'), prefillCategory: 'Saúde', prefillRecurrence: 'monthly' },
              } as any),
            },
          ]
        );
      }
    } catch {
      Alert.alert(t('common.error'), t('weight.alertSaveError'));
    }
  };

  const handleDelete = (record: WeightRecord) => {
    Alert.alert(t('weight.deleteTitle'), t('weight.deleteConfirm', { weight: record.weight, date: record.date }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          try {
            const json = await AsyncStorage.getItem('weightRecords');
            const all: WeightRecord[] = json ? JSON.parse(json) : [];
            await syncWeightRecords(all.filter(r => r.id !== record.id));
            load();
          } catch { /* silent */ }
        }
      },
    ]);
  };

  const latestWeight = records[0]?.weight;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="scale-bathroom" size={20} color={Theme.primary} />
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            {t('weight.title', { name: petName })}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setAdding(a => !a)}>
          <Ionicons name={adding ? 'close' : 'add'} size={24} color={Theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Card resumo */}
        {latestWeight !== undefined && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, ...Shadows.small }]}>
            <View style={[styles.summaryIcon, { backgroundColor: Theme.primary + '18' }]}>
              <MaterialCommunityIcons name="scale-bathroom" size={28} color={Theme.primary} />
            </View>
            <View>
              <Text style={[styles.summaryWeight, { color: colors.text.primary }]}>
                {latestWeight} kg
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
                {t('weight.lastRecord', { date: records[0].date })}
              </Text>
            </View>
          </View>
        )}

        {/* Formulário */}
        {adding && (
          <View style={[styles.form, { backgroundColor: colors.surface, ...Shadows.small }]}>
            <Text style={[styles.formTitle, { color: colors.text.primary }]}>{t('weight.newRecord')}</Text>

            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="scale-bathroom" size={18} color={colors.text.secondary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder={t('weight.weightPlaceholder')}
                placeholderTextColor={colors.text.light}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.inputUnit, { color: colors.text.secondary }]}>kg</Text>
            </View>

            <DatePickerInput
              label={t('weight.dateLabel')}
              value={date}
              onChange={setDate}
              placeholder={t('weight.datePlaceholder')}
              maximumDate={new Date()}
            />

            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 8 }]}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.text.secondary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder={t('weight.notePlaceholder')}
                placeholderTextColor={colors.text.light}
                value={note}
                onChangeText={setNote}
                maxLength={100}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{t('weight.saveBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Alert banner */}
        {weightAlert && !alertDismissed && (
          <View style={[
            styles.alertBanner,
            { backgroundColor: weightAlert.severity === 'danger' ? '#F4433618' : '#FF980018',
              borderColor: weightAlert.severity === 'danger' ? '#F44336' : '#FF9800' },
          ]}>
            <Ionicons
              name={weightAlert.severity === 'danger' ? 'alert-circle' : 'warning'}
              size={22}
              color={weightAlert.severity === 'danger' ? '#F44336' : '#FF9800'}
            />
            <Text style={[styles.alertText, {
              color: weightAlert.severity === 'danger' ? '#F44336' : '#E65100',
            }]}>
              {t(weightAlert.isLoss ? 'weight.alertLoss' : 'weight.alertGain', {
                name: petName,
                pct: weightAlert.pct,
              })}
            </Text>
            <TouchableOpacity onPress={() => setAlertDismissed(true)} style={styles.alertClose}>
              <Ionicons name="close" size={18} color={weightAlert.severity === 'danger' ? '#F44336' : '#FF9800'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Gráfico */}
        <WeightChart records={records} species={petSpecies} />

        {/* Lista */}
        {records.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="scale-bathroom" size={56} color={Theme.primary + '60'} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('weight.emptyTitle')}</Text>
            <Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>
              {t('weight.emptyMsg')}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setAdding(true)}>
              <Text style={styles.emptyBtnText}>{t('weight.addFirst')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.listTitle, { color: colors.text.secondary }]}>
              {t('weight.historyTitle', { count: records.length })}
            </Text>
            {records.map((r, i) => {
              const prev = records[i + 1];
              const diff = prev ? r.weight - prev.weight : null;
              return (
                <View
                  key={r.id}
                  style={[styles.recordCard, { backgroundColor: colors.surface, ...Shadows.small }]}
                >
                  <View style={[styles.recordDot, { backgroundColor: i === 0 ? Theme.primary : colors.border }]} />
                  <View style={styles.recordInfo}>
                    <Text style={[styles.recordWeight, { color: colors.text.primary }]}>
                      {r.weight} kg
                    </Text>
                    {r.note && (
                      <Text style={[styles.recordNote, { color: colors.text.secondary }]} numberOfLines={1}>
                        {r.note}
                      </Text>
                    )}
                  </View>
                  <View style={styles.recordRight}>
                    <Text style={[styles.recordDate, { color: colors.text.secondary }]}>{r.date}</Text>
                    {diff !== null && (
                      <Text style={[styles.recordDiff, {
                        color: diff > 0 ? '#FF9800' : diff < 0 ? '#4CAF50' : colors.text.light,
                      }]}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)} kg
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(r)}>
                    <Ionicons name="trash-outline" size={16} color={colors.text.light} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  summaryIcon: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  summaryWeight: { fontSize: 28, fontWeight: '800' },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  form: { borderRadius: 16, padding: 16, marginBottom: 16 },
  formTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 15 },
  inputUnit: { fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.primary,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32, marginBottom: 20 },
  emptyBtn: { backgroundColor: Theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  listTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  recordInfo: { flex: 1 },
  recordWeight: { fontSize: 16, fontWeight: '700' },
  recordNote: { fontSize: 12, marginTop: 2 },
  recordRight: { alignItems: 'flex-end' },
  recordDate: { fontSize: 12 },
  recordDiff: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  deleteBtn: { padding: 6 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  alertClose: { padding: 4 },
});
