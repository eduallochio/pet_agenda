import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Linking, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';

type ServiceType = {
  id: string;
  label: string;
  subtitle: string;
  query: string;
  icon: string;
  iconLib: 'ion' | 'mci';
  color: string;
  bgColor: string;
  category: 'vet' | 'petshop' | 'hotel' | 'grooming' | 'training' | 'emergency';
};

const SERVICE_BASE: Omit<ServiceType, 'label' | 'subtitle'>[] = [
  {
    id: 'vet',
    query: 'clínica veterinária',
    icon: 'stethoscope',
    iconLib: 'mci',
    color: '#40E0D0',
    bgColor: '#40E0D022',
    category: 'vet',
  },
  {
    id: 'petshop',
    query: 'pet shop banho e tosa',
    icon: 'scissors-cutting',
    iconLib: 'mci',
    color: '#FF6B9D',
    bgColor: '#FF6B9D22',
    category: 'petshop',
  },
  {
    id: 'hotel',
    query: 'hotel pet hospedagem animal',
    icon: 'home-heart',
    iconLib: 'mci',
    color: '#9C27B0',
    bgColor: '#9C27B022',
    category: 'hotel',
  },
  {
    id: 'emergencia',
    query: 'veterinário emergência 24 horas',
    icon: 'stethoscope',
    iconLib: 'mci',
    color: '#4CAF50',
    bgColor: '#4CAF5022',
    category: 'vet',
  },
  {
    id: 'banhotosa',
    query: 'banho e tosa pet',
    icon: 'scissors-cutting',
    iconLib: 'mci',
    color: '#2196F3',
    bgColor: '#2196F322',
    category: 'grooming',
  },
  {
    id: 'adestramento',
    query: 'adestramento cão',
    icon: 'paw',
    iconLib: 'mci',
    color: '#FF9800',
    bgColor: '#FF980022',
    category: 'training',
  },
];

type FilterCategory = 'all' | 'vet' | 'petshop' | 'hotel';

const FILTERS: { value: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'all',     label: 'Todos',    icon: 'list-outline' },
  { value: 'vet',     label: 'Vet',      icon: 'pulse-outline' },
  { value: 'petshop', label: 'Pet Shop', icon: 'cut-outline' },
  { value: 'hotel',   label: 'Hotel',    icon: 'home-outline' },
];

function buildMapsUrl(query: string): string {
  const encoded = encodeURIComponent(query + ' próximo');
  if (Platform.OS === 'ios') return `maps://?q=${encoded}`;
  if (Platform.OS === 'android') return `https://maps.google.com/?q=${encoded}`;
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

export default function NearbyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const SERVICES: ServiceType[] = [
    { ...SERVICE_BASE[0], label: t('nearby.services.vetLabel'),      subtitle: t('nearby.services.vetSub') },
    { ...SERVICE_BASE[1], label: t('nearby.services.petshopLabel'),  subtitle: t('nearby.services.petshopSub') },
    { ...SERVICE_BASE[2], label: t('nearby.services.hotelLabel'),    subtitle: t('nearby.services.hotelSub') },
    { ...SERVICE_BASE[3], label: t('nearby.services.emergencyLabel'),subtitle: t('nearby.services.emergencySub') },
    { ...SERVICE_BASE[4], label: t('nearby.services.groomLabel'),    subtitle: t('nearby.services.groomSub') },
    { ...SERVICE_BASE[5], label: t('nearby.services.trainingLabel'), subtitle: t('nearby.services.trainingSub') },
  ];

  const filtered = SERVICES.filter(s => {
    const matchesFilter = activeFilter === 'all' || s.category === activeFilter;
    const matchesSearch = !search || s.label.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleOpen = async (service: ServiceType) => {
    setLoadingId(service.id);
    const url = buildMapsUrl(service.query);
    try {
      const canOpen = Platform.OS === 'web' ? true : await Linking.canOpenURL(url);
      if (!canOpen) {
        const fallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.query + ' próximo')}`;
        await Linking.openURL(fallback);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert(t('nearby.mapError'), t('nearby.mapErrorMsg'), [{ text: 'OK' }]);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('nearby.title')}</Text>
        <View style={styles.headerBtn}>
          <Ionicons name="map-outline" size={22} color={Theme.primary} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.text.light} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Buscar serviços..."
            placeholderTextColor={colors.text.light}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.text.light} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map(f => {
            const active = activeFilter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[
                  styles.filterChip,
                  active
                    ? { backgroundColor: Theme.primary }
                    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={() => setActiveFilter(f.value)}
              >
                <Ionicons name={f.icon} size={14} color={active ? '#FFFFFF' : colors.text.secondary} />
                <Text style={[styles.filterLabel, { color: active ? '#FFFFFF' : colors.text.secondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Cards de serviços */}
        {filtered.map(service => (
          <TouchableOpacity
            key={service.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleOpen(service)}
            activeOpacity={0.75}
          >
            {/* Ícone */}
            <View style={[styles.iconCircle, { backgroundColor: service.bgColor }]}>
              {service.iconLib === 'ion' ? (
                <Ionicons name={service.icon as any} size={24} color={service.color} />
              ) : (
                <MaterialCommunityIcons name={service.icon as any} size={24} color={service.color} />
              )}
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={1}>{service.label}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.text.secondary }]}>{service.subtitle}</Text>
            </View>

            {/* Loader */}
            {loadingId === service.id && (
              <ActivityIndicator size="small" color={service.color} />
            )}
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={colors.text.light} />
            <Text style={[styles.emptyText, { color: colors.text.light }]}>Nenhum serviço encontrado</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: '#111111', marginLeft: 4 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
  },

  // Filters
  filtersRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterLabel: { fontSize: 12, fontWeight: '600' },

  // Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardInfo: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111111', flex: 1 },
  cardSubtitle: { fontSize: 12, color: '#666666' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: '#999999' },
});
