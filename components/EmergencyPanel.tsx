import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, Linking, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { EmergencyContact, MedicationRecord, Pet } from '../types/pet';

type Props = {
  visible: boolean;
  petId: string;
  onClose: () => void;
};

export default function EmergencyPanel({ visible, petId, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [pet, setPet] = useState<Pet | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      try {
        const [petsJson, contactsJson, medsJson] = await Promise.all([
          AsyncStorage.getItem('pets'),
          AsyncStorage.getItem('petEmergencyContacts'),
          AsyncStorage.getItem('petMedications'),
        ]);
        const allPets: Pet[] = petsJson ? JSON.parse(petsJson) : [];
        setPet(allPets.find(p => p.id === petId) ?? null);
        const allContacts: EmergencyContact[] = contactsJson ? JSON.parse(contactsJson) : [];
        setContacts(allContacts.filter(c => c.petId === petId));
        const allMeds: MedicationRecord[] = medsJson ? JSON.parse(medsJson) : [];
        setMedications(allMeds.filter(m => m.petId === petId && m.active));
      } catch { }
    };
    load();
  }, [visible, petId]);

  const dial = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  };

  const openMaps = (address: string) => {
    const q = encodeURIComponent(address);
    const url = Platform.OS === 'ios'
      ? `maps:?q=${q}`
      : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${q}`)
    );
  };

  const TYPE_ICON: Record<EmergencyContact['type'], keyof typeof Ionicons.glyphMap> = {
    vet: 'medkit-outline',
    clinic: 'business-outline',
    emergency: 'alert-circle-outline',
  };
  const TYPE_COLOR: Record<EmergencyContact['type'], string> = {
    vet: '#4CAF50',
    clinic: '#2196F3',
    emergency: '#F44336',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <View style={styles.emergencyIconCircle}>
                <Ionicons name="alert-circle" size={22} color="#fff" />
              </View>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>{t('emergency.title')}</Text>
                {!!pet && <Text style={[styles.sheetSub, { color: colors.text.secondary }]}>{pet.name}</Text>}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Contatos */}
            {contacts.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>{t('emergency.contacts')}</Text>
                {contacts.map(c => (
                  <View key={c.id} style={[styles.contactCard, { backgroundColor: colors.card, borderLeftColor: TYPE_COLOR[c.type] }]}>
                    <View style={styles.contactInfo}>
                      <View style={styles.contactNameRow}>
                        <Ionicons name={TYPE_ICON[c.type]} size={15} color={TYPE_COLOR[c.type]} />
                        <Text style={[styles.contactName, { color: colors.text.primary }]}>{c.name}</Text>
                      </View>
                      <Text style={[styles.contactPhone, { color: colors.text.secondary }]}>{c.phone}</Text>
                      {!!c.address && (
                        <Text style={[styles.contactAddress, { color: colors.text.light }]} numberOfLines={1}>{c.address}</Text>
                      )}
                    </View>
                    <View style={styles.contactBtns}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} onPress={() => dial(c.phone)}>
                        <Ionicons name="call" size={16} color="#fff" />
                      </TouchableOpacity>
                      {!!c.address && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={() => openMaps(c.address!)}>
                          <Ionicons name="map" size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
                <Ionicons name="call-outline" size={20} color={colors.text.light} />
                <Text style={[styles.emptySectionText, { color: colors.text.secondary }]}>{t('emergency.noContacts')}</Text>
              </View>
            )}

            {/* Alergias */}
            {pet && ((pet.foodAllergies?.length ?? 0) > 0 || (pet.medAllergies?.length ?? 0) > 0 || pet.restrictions) && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>{t('emergency.allergies')}</Text>
                <View style={[styles.allergyCard, { backgroundColor: '#FF572218' }]}>
                  {(pet.foodAllergies?.length ?? 0) > 0 && (
                    <View style={styles.allergyRow}>
                      <Ionicons name="restaurant-outline" size={14} color="#FF5722" />
                      <Text style={styles.allergyLabel}>{t('allergies.food')}: </Text>
                      <Text style={styles.allergyValue}>{pet.foodAllergies!.join(', ')}</Text>
                    </View>
                  )}
                  {(pet.medAllergies?.length ?? 0) > 0 && (
                    <View style={styles.allergyRow}>
                      <Ionicons name="medical-outline" size={14} color="#9C27B0" />
                      <Text style={styles.allergyLabel}>{t('allergies.med')}: </Text>
                      <Text style={styles.allergyValue}>{pet.medAllergies!.join(', ')}</Text>
                    </View>
                  )}
                  {!!pet.restrictions && (
                    <View style={styles.allergyRow}>
                      <Ionicons name="information-circle-outline" size={14} color="#FF9800" />
                      <Text style={styles.allergyLabel}>{t('allergies.restrictions')}: </Text>
                      <Text style={styles.allergyValue}>{pet.restrictions}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Medicamentos ativos */}
            {medications.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>{t('emergency.medications')}</Text>
                {medications.map(m => (
                  <View key={m.id} style={[styles.medCard, { backgroundColor: '#E91E6312' }]}>
                    <Ionicons name="medical" size={14} color="#E91E63" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.medName, { color: colors.text.primary }]}>{m.name}</Text>
                      <Text style={[styles.medDetail, { color: colors.text.secondary }]}>
                        {m.dosage} · {m.frequency}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Sem dados */}
            {contacts.length === 0 && medications.length === 0 && !pet?.foodAllergies?.length && !pet?.medAllergies?.length && (
              <View style={styles.emptyAll}>
                <Text style={[styles.emptyAllText, { color: colors.text.secondary }]}>{t('emergency.noData')}</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeSheetBtn} onPress={onClose}>
            <Text style={styles.closeSheetText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, maxHeight: '85%' },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emergencyIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetSub: { fontSize: 13, marginTop: 1 },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 8, marginTop: 4,
  },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 12, marginBottom: 8, borderLeftWidth: 3,
  },
  contactInfo: { flex: 1 },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  contactName: { fontSize: 14, fontWeight: '700' },
  contactPhone: { fontSize: 13 },
  contactAddress: { fontSize: 11, marginTop: 2 },
  contactBtns: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  allergyCard: { borderRadius: 12, padding: 12, marginBottom: 8, gap: 6 },
  allergyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  allergyLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  allergyValue: { fontSize: 13, color: '#555', flex: 1 },
  medCard: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, marginBottom: 6 },
  medName: { fontSize: 14, fontWeight: '700' },
  medDetail: { fontSize: 12, marginTop: 2 },
  emptySection: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  emptySectionText: { fontSize: 13 },
  emptyAll: { alignItems: 'center', paddingVertical: 20 },
  emptyAllText: { fontSize: 14, textAlign: 'center' },
  closeSheetBtn: {
    margin: 20, marginTop: 8, backgroundColor: '#F44336',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  closeSheetText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
