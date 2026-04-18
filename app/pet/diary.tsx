import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Shadows } from '../../constants/Shadows';
import { DiaryEntry } from '../../types/pet';
import { useTranslation } from 'react-i18next';
import { syncDiaryEntries } from '../../services/syncService';
import NoticeModal from '../../components/NoticeModal';
import ConfirmModal from '../../components/ConfirmModal';

const MOOD_CONFIG: {
  key: DiaryEntry['mood'];
  emoji: string;
  color: string;
}[] = [
  { key: 'great',   emoji: '😄', color: '#4CAF50' },
  { key: 'good',    emoji: '😊', color: '#8BC34A' },
  { key: 'neutral', emoji: '😐', color: '#FF9800' },
  { key: 'bad',     emoji: '😟', color: '#FF5722' },
  { key: 'sick',    emoji: '🤒', color: '#F44336' },
];

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function DiaryScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<DiaryEntry['mood'] | null>(null);
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<DiaryEntry | null>(null);

  const todayStr = formatDate(new Date());

  const load = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem('diaryEntries');
      const all: DiaryEntry[] = json ? JSON.parse(json) : [];
      setEntries(
        all
          .filter(e => e.petId === petId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch { /* silent */ }
  }, [petId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    if (!selectedMood) {
      setNotice({ title: t('common.attention'), message: t('diary.selectMood') });
      return;
    }
    try {
      const json = await AsyncStorage.getItem('diaryEntries');
      const all: DiaryEntry[] = json ? JSON.parse(json) : [];
      const duplicate = all.find(e => e.petId === petId && e.date === todayStr);
      if (duplicate) {
        setNotice({ title: t('common.attention'), message: t('diary.alreadySaved') });
        return;
      }
      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        petId: petId!,
        date: todayStr,
        mood: selectedMood,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };
      all.push(newEntry);
      await syncDiaryEntries(all);
      setSelectedMood(null);
      setNotes('');
      load();
    } catch {
      setNotice({ title: t('common.error'), message: t('common.error') });
    }
  };

  const handleDelete = (entry: DiaryEntry) => {
    setConfirmEntry(entry);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmEntry) return;
    setConfirmEntry(null);
    try {
      const json = await AsyncStorage.getItem('diaryEntries');
      const all: DiaryEntry[] = json ? JSON.parse(json) : [];
      await syncDiaryEntries(all.filter(e => e.id !== confirmEntry.id));
      load();
    } catch { /* silent */ }
  };

  const getMoodConfig = (mood: DiaryEntry['mood']) =>
    MOOD_CONFIG.find(m => m.key === mood) ?? MOOD_CONFIG[2];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="journal-outline" size={20} color="#00897B" />
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            {t('diary.title')}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Today's entry form */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...Shadows.small }]}>
          <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>
            {t('diary.todayEntry')} · {todayStr}
          </Text>

          {/* Mood selector */}
          <View style={styles.moodRow}>
            {MOOD_CONFIG.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.moodBtn,
                  selectedMood === m.key && {
                    backgroundColor: m.color + '25',
                    borderColor: m.color,
                    borderWidth: 2,
                  },
                  selectedMood !== m.key && { borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => setSelectedMood(m.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[
                  styles.moodLabel,
                  { color: selectedMood === m.key ? m.color : colors.text.secondary },
                ]}>
                  {t(`diary.moods.${m.key}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes field */}
          <View style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.notesText, { color: colors.text.primary }]}
              placeholder={t('diary.notesPlaceholder')}
              placeholderTextColor={colors.text.light}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#00897B', opacity: selectedMood ? 1 : 0.5 }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{t('diary.save')}</Text>
          </TouchableOpacity>
        </View>

        {/* History */}
        {entries.length > 0 ? (
          <>
            <Text style={[styles.historyLabel, { color: colors.text.secondary }]}>
              {t('diary.history').toUpperCase()} ({entries.length})
            </Text>
            {entries.map(entry => {
              const mc = getMoodConfig(entry.mood);
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[
                    styles.entryCard,
                    { backgroundColor: mc.color + '18', borderLeftColor: mc.color, ...Shadows.small },
                  ]}
                  onLongPress={() => handleDelete(entry)}
                  activeOpacity={0.85}
                  delayLongPress={500}
                >
                  <Text style={styles.entryEmoji}>{mc.emoji}</Text>
                  <View style={styles.entryInfo}>
                    <View style={styles.entryRow}>
                      <Text style={[styles.entryDate, { color: colors.text.secondary }]}>{entry.date}</Text>
                      <Text style={[styles.entryMoodLabel, { color: mc.color }]}>
                        {t(`diary.moods.${entry.mood}`)}
                      </Text>
                    </View>
                    {!!entry.notes && (
                      <Text style={[styles.entryNotes, { color: colors.text.primary }]} numberOfLines={2}>
                        {entry.notes}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="trash-outline" size={15} color={colors.text.light} style={styles.entryDelete} />
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="journal-outline" size={56} color={'#00897B60'} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('diary.empty')}</Text>
            <Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>{t('diary.emptyMsg')}</Text>
          </View>
        )}
      </ScrollView>

      <NoticeModal
        visible={!!notice}
        type="warning"
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        onConfirm={() => setNotice(null)}
      />

      <ConfirmModal
        visible={!!confirmEntry}
        type="danger"
        title={t('diary.deleteTitle')}
        message={t('diary.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmEntry(null)}
      />
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
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 6 },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  notesText: { fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  historyLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    gap: 10,
  },
  entryEmoji: { fontSize: 28 },
  entryInfo: { flex: 1 },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  entryDate: { fontSize: 12 },
  entryMoodLabel: { fontSize: 12, fontWeight: '700' },
  entryNotes: { fontSize: 13, lineHeight: 18 },
  entryDelete: { padding: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
});
