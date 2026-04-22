import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, Platform, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { fetchAllBreeds, BreedApiData } from '../services/breedApiService';
import { useTranslation } from 'react-i18next';

type Species = 'Cachorro' | 'Gato';
type SizeFilter = 'Todos' | 'Pequeno' | 'Médio' | 'Grande' | 'Gigante';

const SIZE_COLOR: Record<string, string> = {
  Pequeno: '#4CAF50',
  Médio:   '#2196F3',
  Grande:  '#FF9800',
  Gigante: '#9C27B0',
};

export default function BreedExplorerScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation();

  const [species, setSpecies] = useState<Species>('Cachorro');
  const [breeds, setBreeds] = useState<BreedApiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('Todos');

  const load = useCallback(async (s: Species) => {
    setLoading(true);
    setBreeds([]);
    const data = await fetchAllBreeds(s);
    setBreeds(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(species); }, [species, load]);

  const filtered = useMemo(() => {
    let list = breeds;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.origin.toLowerCase().includes(q));
    }
    if (sizeFilter !== 'Todos') {
      list = list.filter(b => b.size === sizeFilter);
    }
    return list;
  }, [breeds, query, sizeFilter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('breedExplorer.headerTitle')}</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Seletor de espécie */}
      <View style={[styles.speciesRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['Cachorro', 'Gato'] as Species[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.speciesBtn, species === s && { backgroundColor: Theme.primary }]}
            onPress={() => { setSpecies(s); setQuery(''); setSizeFilter('Todos'); }}
          >
            <Text style={styles.speciesEmoji}>{s === 'Cachorro' ? '🐕' : '🐱'}</Text>
            <Text style={[styles.speciesLabel, { color: species === s ? '#fff' : colors.text.secondary }]}>
              {s === 'Cachorro' ? t('breedExplorer.dogs') : t('breedExplorer.cats')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Busca */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder={species === 'Cachorro' ? t('breedExplorer.searchDog') : t('breedExplorer.searchCat')}
          placeholderTextColor={colors.text.secondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro de tamanho */}
      <View style={styles.filterRow}>
        {(['Todos', 'Pequeno', 'Médio', 'Grande', 'Gigante'] as SizeFilter[]).map(size => {
          const active = sizeFilter === size;
          const color = size === 'Todos' ? Theme.primary : (SIZE_COLOR[size] ?? Theme.primary);
          const sizeLabel: Record<SizeFilter, string> = {
            Todos: t('breedExplorer.sizes.all'),
            Pequeno: t('breedExplorer.sizes.small'),
            Médio: t('breedExplorer.sizes.medium'),
            Grande: t('breedExplorer.sizes.large'),
            Gigante: t('breedExplorer.sizes.giant'),
          };
          return (
            <TouchableOpacity
              key={size}
              style={[
                styles.filterChip,
                { borderColor: color },
                active && { backgroundColor: color },
              ]}
              onPress={() => setSizeFilter(size)}
            >
              <Text style={[styles.filterChipText, { color: active ? '#fff' : color }]}>{sizeLabel[size]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contador */}
      {!loading && (
        <Text style={[styles.countText, { color: colors.text.secondary }]}>
          {t(filtered.length === 1 ? 'breedExplorer.found_one' : 'breedExplorer.found_other', { count: filtered.length })}
        </Text>
      )}

      {/* Lista */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            {t('breedExplorer.loading')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => `${item.name}_${i}`}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="search-outline" size={48} color={colors.text.secondary} />
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                {t('breedExplorer.empty')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <BreedCard
              breed={item}
              colors={colors}
              onPress={() =>
                router.push({
                  pathname: '/breed-info',
                  params: { breed: item.name, species: item.species },
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function BreedCard({
  breed, colors, onPress,
}: {
  breed: BreedApiData;
  colors: any;
  onPress: () => void;
}) {
  const sizeColor = SIZE_COLOR[breed.size] ?? Theme.primary;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' } : Shadows.small) }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {breed.photoUrl ? (
        <Image source={{ uri: breed.photoUrl }} style={styles.cardPhoto} resizeMode="cover" />
      ) : (
        <View style={[styles.cardPhotoPlaceholder, { backgroundColor: Theme.primary + '12' }]}>
          <Text style={styles.cardEmoji}>{breed.emoji}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.text.primary }]} numberOfLines={1}>{breed.name}</Text>
        <Text style={[styles.cardOrigin, { color: colors.text.secondary }]} numberOfLines={1}>{breed.origin}</Text>
        <View style={styles.cardFooter}>
          <View style={[styles.sizeTag, { backgroundColor: sizeColor + '20' }]}>
            <Text style={[styles.sizeTagText, { color: sizeColor }]}>{breed.size}</Text>
          </View>
          {breed.ratings && (
            <View style={styles.energyRow}>
              <Ionicons name="flash" size={11} color="#FF9800" />
              <Text style={[styles.energyText, { color: colors.text.secondary }]}>
                {breed.ratings.energy}/5
              </Text>
            </View>
          )}
        </View>
        {breed.temperament.length > 0 && (
          <Text style={[styles.cardTemp, { color: colors.text.secondary }]} numberOfLines={1}>
            {breed.temperament.slice(0, 2).join(' · ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
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
  speciesRow: {
    flexDirection: 'row', padding: 12, gap: 10, borderBottomWidth: 1,
  },
  speciesBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
  },
  speciesEmoji: { fontSize: 18 },
  speciesLabel: { fontSize: 15, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16,
    marginBottom: 8, flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5,
  },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  countText: { fontSize: 12, paddingHorizontal: 16, marginBottom: 6 },
  grid: { paddingHorizontal: 12, paddingBottom: 32 },
  columnWrapper: { gap: 12, marginBottom: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14, marginTop: 12 },
  emptyText: { fontSize: 15 },
  // Card
  card: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  cardPhoto: { width: '100%', height: 130 },
  cardPhotoPlaceholder: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 40 },
  cardBody: { padding: 10 },
  cardName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardOrigin: { fontSize: 11, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sizeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sizeTagText: { fontSize: 10, fontWeight: '700' },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  energyText: { fontSize: 10 },
  cardTemp: { fontSize: 11 },
});
