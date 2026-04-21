import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Image, Linking, FlatList, Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { useTranslation } from 'react-i18next';
import { useBreedInfo } from '../hooks/useBreedInfo';
import { BreedRatings, fetchBreedGallery } from '../services/breedApiService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_ITEM_WIDTH = SCREEN_WIDTH * 0.62;

function useBreedGallery(breedId: string | number | undefined, species: string | undefined) {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    if (!breedId || !species || (species !== 'Cachorro' && species !== 'Gato')) return;
    fetchBreedGallery(breedId, species as 'Cachorro' | 'Gato', 10).then(setPhotos);
  }, [breedId, species]);
  return photos;
}

const SIZE_COLOR: Record<string, string> = {
  Pequeno: '#4CAF50',
  Médio:   '#2196F3',
  Grande:  '#FF9800',
  Gigante: '#9C27B0',
};

const RATING_LABELS: { key: keyof BreedRatings; label: string; icon: string }[] = [
  { key: 'energy',           label: 'Energia',              icon: 'flash-outline' },
  { key: 'affection',        label: 'Afeto',                icon: 'heart-outline' },
  { key: 'intelligence',     label: 'Inteligência',         icon: 'bulb-outline' },
  { key: 'grooming',         label: 'Cuidados com pelo',    icon: 'cut-outline' },
  { key: 'health',           label: 'Saúde geral',          icon: 'medical-outline' },
  { key: 'childFriendly',    label: 'Com crianças',         icon: 'happy-outline' },
  { key: 'strangerFriendly', label: 'Com estranhos',        icon: 'people-outline' },
];

function RatingBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={ratingStyles.track}>
      {[1, 2, 3, 4, 5].map(i => (
        <View
          key={i}
          style={[
            ratingStyles.dot,
            { backgroundColor: i <= value ? color : color + '30' },
          ]}
        />
      ))}
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7 },
});

export default function BreedInfoScreen() {
  const router = useRouter();
  const { breed, species } = useLocalSearchParams<{ breed: string; species: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const breedState = useBreedInfo(breed ?? '', species ?? '');
  const breedData = breedState.status === 'found' ? breedState.data : null;
  const galleryPhotos = useBreedGallery(breedData?.breedId, breedData?.species ?? '');

  const header = (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
        {breedState.status === 'found' ? breedState.data.name : t('breedInfo.headerTitle')}
      </Text>
      <View style={styles.headerBtn} />
    </View>
  );

  if (breedState.status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Buscando informações...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (breedState.status === 'not_found') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View style={styles.centered}>
          <View style={[styles.notFoundCircle, { backgroundColor: Theme.primary + '15' }]}>
            <Ionicons name="search-outline" size={52} color={Theme.primary} />
          </View>
          <Text style={[styles.notFoundTitle, { color: colors.text.primary }]}>
            {t('breedInfo.notFoundTitle')}
          </Text>
          <Text style={[styles.notFoundMsg, { color: colors.text.secondary }]}>
            {t('breedInfo.notFoundMsg', { breed })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const info = breedState.data;
  const sizeColor = SIZE_COLOR[info.size] ?? Theme.primary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero com foto */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' } : Shadows.medium) }]}>
          {info.photoUrl ? (
            <Image source={{ uri: info.photoUrl }} style={styles.heroPhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.heroPhotoPlaceholder, { backgroundColor: Theme.primary + '15' }]}>
              <Text style={styles.heroEmoji}>{info.emoji}</Text>
            </View>
          )}

          <View style={styles.heroBody}>
            <Text style={[styles.heroName, { color: colors.text.primary }]}>{info.name}</Text>
            <Text style={[styles.heroOrigin, { color: colors.text.secondary }]}>
              {info.species} · {info.origin}
            </Text>
            <View style={styles.tagsRow}>
              <View style={[styles.tag, { backgroundColor: sizeColor + '20' }]}>
                <Text style={[styles.tagText, { color: sizeColor }]}>{info.size}</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: Theme.primary + '20', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Ionicons name="time-outline" size={13} color={Theme.primary} />
                <Text style={[styles.tagText, { color: Theme.primary }]}>{info.lifespan}</Text>
              </View>
              {info.indoor !== undefined && (
                <View style={[styles.tag, { backgroundColor: '#009688' + '20', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Ionicons name={info.indoor ? 'home-outline' : 'sunny-outline'} size={13} color="#009688" />
                  <Text style={[styles.tagText, { color: '#009688' }]}>{info.indoor ? 'Interior' : 'Exterior'}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Galeria de fotos */}
        {galleryPhotos.length > 1 && (
          <View style={styles.gallerySection}>
            <View style={styles.gallerySectionHeader}>
              <Ionicons name="images-outline" size={18} color={Theme.primary} />
              <Text style={[styles.gallerySectionTitle, { color: colors.text.primary }]}>Galeria de fotos</Text>
            </View>
            <FlatList
              data={galleryPhotos}
              keyExtractor={(_, i) => String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={GALLERY_ITEM_WIDTH + 12}
              decelerationRate="fast"
              contentContainerStyle={styles.galleryList}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.galleryPhoto}
                  resizeMode="cover"
                />
              )}
            />
          </View>
        )}

        {/* Ratings */}
        {info.ratings && (
          <SectionCard title="Características" icon="stats-chart-outline" colors={colors}>
            {RATING_LABELS.map(({ key, label, icon }) => (
              <View key={key} style={styles.ratingRow}>
                <Ionicons name={icon as any} size={16} color={Theme.primary} style={styles.ratingIcon} />
                <Text style={[styles.ratingLabel, { color: colors.text.primary }]}>{label}</Text>
                <RatingBar value={info.ratings![key]} color={Theme.primary} />
              </View>
            ))}
          </SectionCard>
        )}

        {/* Temperamento */}
        {info.temperament.length > 0 && (
          <SectionCard title={t('breedInfo.temperament')} icon="heart-outline" colors={colors}>
            <View style={styles.chipGrid}>
              {info.temperament.map(trait => (
                <View key={trait} style={[styles.chip, { backgroundColor: Theme.primary + '15' }]}>
                  <Text style={[styles.chipText, { color: Theme.primary }]}>{trait}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Características */}
        {!!info.characteristics && (
          <SectionCard title={t('breedInfo.characteristics')} icon="paw-outline" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.text.primary }]}>{info.characteristics}</Text>
          </SectionCard>
        )}

        {/* Cuidados */}
        {info.care.length > 0 && (
          <SectionCard title={t('breedInfo.care')} icon="medkit-outline" colors={colors}>
            {info.care.map((c, i) => (
              <View key={i} style={styles.careRow}>
                <View style={[styles.careDot, { backgroundColor: Theme.primary }]} />
                <Text style={[styles.careText, { color: colors.text.primary }]}>{c}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Curiosidade */}
        {!!info.curiosity && (
          <View style={[styles.curiosityCard, { backgroundColor: '#FF9800' + '15', borderLeftColor: '#FF9800' }]}>
            <View style={styles.curiosityIcon}>
              <Ionicons name="bulb-outline" size={22} color="#E65100" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.curiosityTitle, { color: '#E65100' }]}>{t('breedInfo.curiosityTitle')}</Text>
              <Text style={[styles.curiosityText, { color: colors.text.primary }]}>{info.curiosity}</Text>
            </View>
          </View>
        )}

        {/* Links externos */}
        {(info.wikipediaUrl || info.cfaUrl || info.vetstreetUrl) && (
          <SectionCard title="Saiba mais" icon="link-outline" colors={colors}>
            {info.wikipediaUrl && (
              <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(info.wikipediaUrl!)}>
                <Ionicons name="globe-outline" size={20} color="#555" />
                <Text style={[styles.linkText, { color: Theme.primary }]}>Wikipedia</Text>
                <Ionicons name="open-outline" size={14} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
            {info.vetstreetUrl && (
              <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(info.vetstreetUrl!)}>
                <Ionicons name="medkit-outline" size={20} color="#555" />
                <Text style={[styles.linkText, { color: Theme.primary }]}>VetStreet</Text>
                <Ionicons name="open-outline" size={14} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
            {info.cfaUrl && (
              <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(info.cfaUrl!)}>
                <Ionicons name="ribbon-outline" size={20} color="#555" />
                <Text style={[styles.linkText, { color: Theme.primary }]}>CFA</Text>
                <Ionicons name="open-outline" size={14} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </SectionCard>
        )}

        {/* Explorar outras raças */}
        <TouchableOpacity
          style={[styles.explorerBtn, { backgroundColor: Theme.primary + '15', borderColor: Theme.primary + '40' }]}
          onPress={() => router.push({ pathname: '/breed-explorer' } as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={20} color={Theme.primary} />
          <Text style={[styles.explorerBtnText, { color: Theme.primary }]}>Explorar outras raças de {info.species === 'Cachorro' ? 'cães' : 'gatos'}</Text>
          <Ionicons name="chevron-forward" size={18} color={Theme.primary} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ title, icon, colors, children }: {
  title: string; icon: string; colors: any; children: React.ReactNode;
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 14 },
  // Hero
  heroCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  heroPhoto: { width: '100%', height: 220 },
  heroPhotoPlaceholder: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 64 },
  heroBody: { padding: 20, alignItems: 'center' },
  heroName: { fontSize: 24, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  heroOrigin: { fontSize: 14, marginBottom: 14 },
  tagsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  tag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 13, fontWeight: '700' },
  // Ratings
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ratingIcon: { marginRight: 8 },
  ratingLabel: { flex: 1, fontSize: 14 },
  // Sections
  sectionCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  bodyText: { fontSize: 14, lineHeight: 22 },
  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600' },
  // Care
  careRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  careDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, marginRight: 10 },
  careText: { flex: 1, fontSize: 14, lineHeight: 20 },
  // Curiosity
  curiosityCard: {
    flexDirection: 'row', borderLeftWidth: 4, borderRadius: 12,
    padding: 16, marginBottom: 12, gap: 12,
  },
  curiosityIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FF9800' + '25',
    justifyContent: 'center', alignItems: 'center',
  },
  curiosityTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  curiosityText: { fontSize: 14, lineHeight: 20 },
  // Links
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0 },
  linkText: { flex: 1, fontSize: 14, fontWeight: '600' },
  // Explorer button
  explorerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12,
  },
  explorerBtnText: { flex: 1, fontSize: 14, fontWeight: '600' },
  // Gallery
  gallerySection: { marginBottom: 12 },
  gallerySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  gallerySectionTitle: { fontSize: 16, fontWeight: '700' },
  galleryList: { paddingRight: 16 },
  galleryPhoto: {
    width: GALLERY_ITEM_WIDTH,
    height: GALLERY_ITEM_WIDTH * 0.75,
    borderRadius: 14,
    marginRight: 12,
  },
  // Not found
  notFoundCircle: {
    width: 110, height: 110, borderRadius: 55,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  notFoundTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  notFoundMsg: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
