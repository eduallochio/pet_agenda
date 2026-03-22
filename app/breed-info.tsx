import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { findBreedInfo } from '../constants/breedInfo';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { useTranslation } from 'react-i18next';

const SIZE_COLOR: Record<string, string> = {
  Pequeno: '#4CAF50',
  Médio:   '#2196F3',
  Grande:  '#FF9800',
  Gigante: '#9C27B0',
};

export default function BreedInfoScreen() {
  const router = useRouter();
  const { breed, species } = useLocalSearchParams<{ breed: string; species: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const info = findBreedInfo(breed ?? '', species);

  if (!info) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('breedInfo.headerTitle')}</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.notFoundContainer}>
          <View style={[styles.notFoundIconCircle, { backgroundColor: Theme.primary + '15' }]}>
            <Ionicons name="search-outline" size={52} color={Theme.primary} />
          </View>
          <Text style={[styles.notFoundTitle, { color: colors.text.primary }]}>{t('breedInfo.notFoundTitle')}</Text>
          <Text style={[styles.notFoundMessage, { color: colors.text.secondary }]}>
            {t('breedInfo.notFoundMsg', { breed })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const sizeColor = SIZE_COLOR[info.size] ?? Theme.primary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
          {info.name}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' } : Shadows.medium) }]}>
          <Text style={styles.heroEmoji}>{info.emoji}</Text>
          <Text style={[styles.heroName, { color: colors.text.primary }]}>{info.name}</Text>
          <Text style={[styles.heroSpecies, { color: colors.text.secondary }]}>
            {info.species} · {info.origin}
          </Text>

          {/* Tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: sizeColor + '20' }]}>
              <Text style={[styles.tagText, { color: sizeColor }]}>{info.size}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: Theme.primary + '20', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Ionicons name="time-outline" size={13} color={Theme.primary} />
              <Text style={[styles.tagText, { color: Theme.primary }]}>{info.lifespan}</Text>
            </View>
          </View>
        </View>

        {/* Temperamento */}
        <SectionCard title={t('breedInfo.temperament')} icon="heart-outline" colors={colors}>
          <View style={styles.temperamentGrid}>
            {info.temperament.map(trait => (
              <View key={trait} style={[styles.temperamentChip, { backgroundColor: Theme.primary + '15' }]}>
                <Text style={[styles.temperamentText, { color: Theme.primary }]}>{trait}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* Características */}
        <SectionCard title={t('breedInfo.characteristics')} icon="paw-outline" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.text.primary }]}>{info.characteristics}</Text>
        </SectionCard>

        {/* Cuidados */}
        <SectionCard title={t('breedInfo.care')} icon="medkit-outline" colors={colors}>
          {info.care.map((c, i) => (
            <View key={i} style={styles.careRow}>
              <View style={[styles.careDot, { backgroundColor: Theme.primary }]} />
              <Text style={[styles.careText, { color: colors.text.primary }]}>{c}</Text>
            </View>
          ))}
        </SectionCard>

        {/* Curiosidade */}
        <View style={[styles.curiosityCard, { backgroundColor: '#FF9800' + '15', borderLeftColor: '#FF9800' }]}>
          <View style={styles.curiosityIconCircle}>
            <Ionicons name="bulb-outline" size={22} color="#E65100" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.curiosityTitle, { color: '#E65100' }]}>{t('breedInfo.curiosityTitle')}</Text>
            <Text style={[styles.curiosityText, { color: colors.text.primary }]}>{info.curiosity}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ title, icon, colors, children }: {
  title: string;
  icon: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : Shadows.small) }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={Theme.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
      </View>
      {children}
    </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  // Hero
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroEmoji: { fontSize: 56, marginBottom: 10 },
  heroName: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  heroSpecies: { fontSize: 14, marginBottom: 14 },
  tagsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  tag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 13, fontWeight: '700' },
  // Sections
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  bodyText: { fontSize: 14, lineHeight: 22 },
  // Temperament
  temperamentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  temperamentChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  temperamentText: { fontSize: 13, fontWeight: '600' },
  // Care
  careRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  careDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, marginRight: 10 },
  careText: { flex: 1, fontSize: 14, lineHeight: 20 },
  // Curiosity
  curiosityCard: {
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  curiosityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF9800' + '25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  curiosityTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  curiosityText: { fontSize: 14, lineHeight: 20 },
  // Not found
  notFoundContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  notFoundTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  notFoundMessage: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
