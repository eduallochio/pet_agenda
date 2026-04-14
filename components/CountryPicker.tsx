import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList,
  TextInput, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { useTranslation } from 'react-i18next';

export type Country = {
  code: string;   // ISO 3166-1 alpha-2
  name: string;   // Nome no idioma atual
  flag: string;   // Emoji de bandeira
  dialCode: string; // Ex: "+55"
};

// Países mais usados ficam no topo, depois ordem alfabética
const TOP_COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil',          flag: '🇧🇷', dialCode: '+55'  },
  { code: 'US', name: 'United States',   flag: '🇺🇸', dialCode: '+1'   },
  { code: 'PT', name: 'Portugal',        flag: '🇵🇹', dialCode: '+351' },
  { code: 'AR', name: 'Argentina',       flag: '🇦🇷', dialCode: '+54'  },
  { code: 'MX', name: 'México',          flag: '🇲🇽', dialCode: '+52'  },
  { code: 'CO', name: 'Colombia',        flag: '🇨🇴', dialCode: '+57'  },
  { code: 'CL', name: 'Chile',           flag: '🇨🇱', dialCode: '+56'  },
  { code: 'UY', name: 'Uruguay',         flag: '🇺🇾', dialCode: '+598' },
  { code: 'PE', name: 'Peru',            flag: '🇵🇪', dialCode: '+51'  },
  { code: 'GB', name: 'United Kingdom',  flag: '🇬🇧', dialCode: '+44'  },
  { code: 'ES', name: 'España',          flag: '🇪🇸', dialCode: '+34'  },
  { code: 'DE', name: 'Deutschland',     flag: '🇩🇪', dialCode: '+49'  },
  { code: 'FR', name: 'France',          flag: '🇫🇷', dialCode: '+33'  },
  { code: 'IT', name: 'Italia',          flag: '🇮🇹', dialCode: '+39'  },
  { code: 'CA', name: 'Canada',          flag: '🇨🇦', dialCode: '+1'   },
  { code: 'AU', name: 'Australia',       flag: '🇦🇺', dialCode: '+61'  },
  { code: 'JP', name: 'Japan',           flag: '🇯🇵', dialCode: '+81'  },
];

const OTHER_COUNTRIES: Country[] = [
  { code: 'AO', name: 'Angola',           flag: '🇦🇴', dialCode: '+244' },
  { code: 'AT', name: 'Austria',          flag: '🇦🇹', dialCode: '+43'  },
  { code: 'BE', name: 'Belgium',          flag: '🇧🇪', dialCode: '+32'  },
  { code: 'BO', name: 'Bolivia',          flag: '🇧🇴', dialCode: '+591' },
  { code: 'CH', name: 'Switzerland',      flag: '🇨🇭', dialCode: '+41'  },
  { code: 'CN', name: 'China',            flag: '🇨🇳', dialCode: '+86'  },
  { code: 'CR', name: 'Costa Rica',       flag: '🇨🇷', dialCode: '+506' },
  { code: 'CU', name: 'Cuba',             flag: '🇨🇺', dialCode: '+53'  },
  { code: 'DO', name: 'Dominican Rep.',   flag: '🇩🇴', dialCode: '+1'   },
  { code: 'EC', name: 'Ecuador',          flag: '🇪🇨', dialCode: '+593' },
  { code: 'GH', name: 'Ghana',            flag: '🇬🇭', dialCode: '+233' },
  { code: 'GT', name: 'Guatemala',        flag: '🇬🇹', dialCode: '+502' },
  { code: 'HN', name: 'Honduras',         flag: '🇭🇳', dialCode: '+504' },
  { code: 'IN', name: 'India',            flag: '🇮🇳', dialCode: '+91'  },
  { code: 'IL', name: 'Israel',           flag: '🇮🇱', dialCode: '+972' },
  { code: 'KR', name: 'South Korea',      flag: '🇰🇷', dialCode: '+82'  },
  { code: 'MZ', name: 'Mozambique',       flag: '🇲🇿', dialCode: '+258' },
  { code: 'NI', name: 'Nicaragua',        flag: '🇳🇮', dialCode: '+505' },
  { code: 'NL', name: 'Netherlands',      flag: '🇳🇱', dialCode: '+31'  },
  { code: 'NO', name: 'Norway',           flag: '🇳🇴', dialCode: '+47'  },
  { code: 'NZ', name: 'New Zealand',      flag: '🇳🇿', dialCode: '+64'  },
  { code: 'PA', name: 'Panama',           flag: '🇵🇦', dialCode: '+507' },
  { code: 'PH', name: 'Philippines',      flag: '🇵🇭', dialCode: '+63'  },
  { code: 'PL', name: 'Poland',           flag: '🇵🇱', dialCode: '+48'  },
  { code: 'PY', name: 'Paraguay',         flag: '🇵🇾', dialCode: '+595' },
  { code: 'RU', name: 'Russia',           flag: '🇷🇺', dialCode: '+7'   },
  { code: 'SA', name: 'Saudi Arabia',     flag: '🇸🇦', dialCode: '+966' },
  { code: 'SE', name: 'Sweden',           flag: '🇸🇪', dialCode: '+46'  },
  { code: 'SV', name: 'El Salvador',      flag: '🇸🇻', dialCode: '+503' },
  { code: 'TR', name: 'Turkey',           flag: '🇹🇷', dialCode: '+90'  },
  { code: 'VE', name: 'Venezuela',        flag: '🇻🇪', dialCode: '+58'  },
  { code: 'ZA', name: 'South Africa',     flag: '🇿🇦', dialCode: '+27'  },
].sort((a, b) => a.name.localeCompare(b.name));

export const ALL_COUNTRIES: Country[] = [...TOP_COUNTRIES, ...OTHER_COUNTRIES];

type Props = {
  value?: Country | null;
  onChange: (country: Country) => void;
};

export default function CountryPicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_COUNTRIES;
    const q = search.toLowerCase();
    return ALL_COUNTRIES.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (country: Country) => {
    onChange(country);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerFlag}>{value?.flag ?? '🌍'}</Text>
        <Text style={[styles.triggerText, { color: value ? colors.text.primary : colors.text.light }]} numberOfLines={1}>
          {value?.name ?? t('editProfile.countryPlaceholder', 'Selecionar país')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {t('editProfile.countrySelect', 'Selecionar País')}
            </Text>
            <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.text.light} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('editProfile.countrySearch', 'Buscar país...')}
              placeholderTextColor={colors.text.light}
              style={[styles.searchInput, { color: colors.text.primary }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.text.light} />
              </TouchableOpacity>
            )}
          </View>

          {/* Lista */}
          <FlatList
            data={filtered}
            keyExtractor={c => c.code}
            renderItem={({ item }) => {
              const isSelected = item.code === value?.code;
              return (
                <TouchableOpacity
                  style={[
                    styles.countryRow,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: Theme.primary + '12' },
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.65}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryName, { color: colors.text.primary }]}>{item.name}</Text>
                  <Text style={[styles.countryDial, { color: colors.text.light }]}>{item.dialCode}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={Theme.primary} style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 13, gap: 10,
  },
  triggerFlag: { fontSize: 22 },
  triggerText: { flex: 1, fontSize: 15 },

  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { padding: 4 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },

  countryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryFlag: { fontSize: 24, marginRight: 12 },
  countryName: { flex: 1, fontSize: 15 },
  countryDial: { fontSize: 13 },
});
