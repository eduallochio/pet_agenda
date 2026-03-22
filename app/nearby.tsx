import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import FadeIn from '../components/animations/FadeIn';
import PressableCard from '../components/animations/PressableCard';
import { useTranslation } from 'react-i18next';

// Tipos de serviço disponíveis
type ServiceType = {
  id: string;
  label: string;
  subtitle: string;
  query: string;         // termo para busca no Maps
  icon: string;
  iconLib: 'ion' | 'mci';
  color: string;
  bgColor: string;
};

const SERVICE_BASE: Omit<ServiceType, 'label' | 'subtitle'>[] = [
  {
    id: 'petshop',
    query: 'pet shop',
    icon: 'storefront-outline',
    iconLib: 'ion',
    color: '#FF6B9D',
    bgColor: '#FFF0F5',
  },
  {
    id: 'vet',
    query: 'clínica veterinária',
    icon: 'medical-bag',
    iconLib: 'mci',
    color: '#4CAF50',
    bgColor: '#F0FFF1',
  },
  {
    id: 'banhotosa',
    query: 'banho e tosa pet',
    icon: 'scissors-cutting',
    iconLib: 'mci',
    color: '#2196F3',
    bgColor: '#F0F7FF',
  },
  {
    id: 'hotel',
    query: 'hotel pet hospedagem animal',
    icon: 'home-heart',
    iconLib: 'mci',
    color: '#FF9800',
    bgColor: '#FFF8F0',
  },
  {
    id: 'adestramento',
    query: 'adestramento cão',
    icon: 'paw',
    iconLib: 'mci',
    color: '#9C27B0',
    bgColor: '#FAF0FF',
  },
  {
    id: 'emergencia',
    query: 'veterinário emergência 24 horas',
    icon: 'alert-circle-outline',
    iconLib: 'ion',
    color: '#F44336',
    bgColor: '#FFF0F0',
  },
];

// Gera URL do Maps dependendo da plataforma
function buildMapsUrl(query: string): string {
  const encoded = encodeURIComponent(query + ' próximo');
  if (Platform.OS === 'ios') {
    // Tenta abrir Apple Maps; se não abrir, handleOpen faz fallback para Google Maps web
    return `maps://?q=${encoded}`;
  }
  if (Platform.OS === 'android') {
    // geo:0,0?q= é instável para busca textual — usa Google Maps diretamente
    return `https://maps.google.com/?q=${encoded}`;
  }
  // Web: Google Maps
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

function ServiceCard({
  service,
  onPress,
  loading,
  index,
}: {
  service: ServiceType;
  onPress: (s: ServiceType) => void;
  loading: boolean;
  index: number;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
        : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }),
    },
  ];

  return (
    <FadeIn delay={index * 60} duration={320}>
      <PressableCard
        style={cardStyle}
        onPress={() => onPress(service)}
        haptic
      >
        {/* Ícone */}
        <View style={[styles.iconCircle, { backgroundColor: service.bgColor }]}>
          {service.iconLib === 'ion' ? (
            <Ionicons name={service.icon as any} size={28} color={service.color} />
          ) : (
            <MaterialCommunityIcons name={service.icon as any} size={28} color={service.color} />
          )}
        </View>

        {/* Texto */}
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{service.label}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.text.secondary }]}>{service.subtitle}</Text>
        </View>

        {/* Chevron / loader */}
        <View style={styles.cardRight}>
          {loading ? (
            <ActivityIndicator size="small" color={service.color} />
          ) : (
            <View style={[styles.chevronCircle, { backgroundColor: service.color + '18' }]}>
              <Ionicons name="navigate-outline" size={18} color={service.color} />
            </View>
          )}
        </View>
      </PressableCard>
    </FadeIn>
  );
}

export default function NearbyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const SERVICES: ServiceType[] = [
    { ...SERVICE_BASE[0], label: t('nearby.services.petshopLabel'), subtitle: t('nearby.services.petshopSub') },
    { ...SERVICE_BASE[1], label: t('nearby.services.vetLabel'),     subtitle: t('nearby.services.vetSub') },
    { ...SERVICE_BASE[2], label: t('nearby.services.groomLabel'),   subtitle: t('nearby.services.groomSub') },
    { ...SERVICE_BASE[3], label: t('nearby.services.hotelLabel'),   subtitle: t('nearby.services.hotelSub') },
    { ...SERVICE_BASE[4], label: t('nearby.services.trainingLabel'),subtitle: t('nearby.services.trainingSub') },
    { ...SERVICE_BASE[5], label: t('nearby.services.emergencyLabel'),subtitle: t('nearby.services.emergencySub') },
  ];

  const handleOpen = async (service: ServiceType) => {
    setLoadingId(service.id);
    const url = buildMapsUrl(service.query);

    try {
      const canOpen = Platform.OS === 'web' ? true : await Linking.canOpenURL(url);

      if (!canOpen) {
        // Fallback para Google Maps web
        const fallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.query + ' próximo')}`;
        await Linking.openURL(fallback);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert(
        t('nearby.mapError'),
        t('nearby.mapErrorMsg'),
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('nearby.title')}</Text>
          <Text style={[styles.headerSub, { color: colors.text.secondary }]}>{t('nearby.subtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: Theme.primary + '18', borderColor: Theme.primary + '40' }]}>
          <Ionicons name="location-outline" size={20} color={Theme.primary} />
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            {t('nearby.infoBanner')}
          </Text>
        </View>

        {/* Cards de serviços */}
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>{t('nearby.categories')}</Text>

        {SERVICES.map((service, i) => (
          <ServiceCard
            key={service.id}
            service={service}
            onPress={handleOpen}
            loading={loadingId === service.id}
            index={i}
          />
        ))}

        {/* Dica no rodapé */}
        <View style={[styles.tipBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.text.light} />
          <Text style={[styles.tipText, { color: colors.text.light }]}>
            {t('nearby.tip')}
          </Text>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, lineHeight: 16 },
  cardRight: { width: 36, alignItems: 'center' },
  chevronCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tip
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
