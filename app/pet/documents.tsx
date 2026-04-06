import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Image,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useGoBack } from '../../hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { Shadows } from '../../constants/Shadows';
import { PetDocument } from '../../types/pet';
import DatePickerInput from '../../components/DatePickerInput';

const STORAGE_KEY = 'petDocuments';

type DocumentType = PetDocument['type'];

const TYPE_COLORS: Record<DocumentType, string> = {
  vaccine_card: '#4CAF50',
  prescription: '#2196F3',
  exam: '#FF9800',
  rga: '#9C27B0',
  other: '#607D8B',
};

const TYPE_ICONS: Record<DocumentType, keyof typeof Ionicons.glyphMap> = {
  vaccine_card: 'shield-checkmark-outline',
  prescription: 'medkit-outline',
  exam: 'flask-outline',
  rga: 'id-card-outline',
  other: 'document-outline',
};

const ALL_TYPES: DocumentType[] = ['vaccine_card', 'prescription', 'exam', 'rga', 'other'];

function getTodayStr(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PetDocumentsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const goBack = useGoBack('/');
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PetDocument | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<DocumentType>('vaccine_card');
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [formDate, setFormDate] = useState<Date | null>(new Date());
  const [formNote, setFormNote] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [petId])
  );

  const loadDocuments = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const all: PetDocument[] = json ? JSON.parse(json) : [];
      setDocuments(all.filter(d => d.petId === petId));
    } catch (e) {
      if (__DEV__) console.error('Error loading documents:', e);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormType('vaccine_card');
    setFormPhoto(null);
    setFormDate(new Date());
    setFormNote('');
  };

  const openAddModal = () => {
    resetForm();
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    resetForm();
  };

  const pickPhoto = () => {
    Alert.alert(t('documents.addPhoto'), t('documents.photoOptions'), [
      {
        text: t('documents.camera'),
        onPress: async () => {
          if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error'), t('addPet.cameraPermission'));
              return;
            }
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets.length > 0) {
            setFormPhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: t('documents.gallery'),
        onPress: async () => {
          if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error'), t('addPet.galleryPermission'));
              return;
            }
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets.length > 0) {
            setFormPhoto(result.assets[0].uri);
          }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const saveDocument = async () => {
    if (!formTitle.trim()) {
      Alert.alert(t('common.attention'), t('documents.titleLabel'));
      return;
    }
    if (!formPhoto) {
      Alert.alert(t('common.attention'), t('documents.addPhoto'));
      return;
    }
    setSaving(true);
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const all: PetDocument[] = json ? JSON.parse(json) : [];
      const newDoc: PetDocument = {
        id: Date.now().toString(),
        petId: petId ?? '',
        title: formTitle.trim(),
        type: formType,
        photoUri: formPhoto,
        date: formDate
          ? `${String(formDate.getDate()).padStart(2,'0')}/${String(formDate.getMonth()+1).padStart(2,'0')}/${formDate.getFullYear()}`
          : getTodayStr(),
        note: formNote.trim() || undefined,
      };
      all.push(newDoc);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setDocuments(prev => [...prev, newDoc]);
      closeAddModal();
    } catch (e) {
      Alert.alert(t('common.error'), t('documents.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (doc: PetDocument) => {
    Alert.alert(
      t('documents.deleteTitle'),
      t('documents.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteDocument(doc.id),
        },
      ]
    );
  };

  const deleteDocument = async (id: string) => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const all: PetDocument[] = json ? JSON.parse(json) : [];
      const updated = all.filter(d => d.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (viewModalVisible) {
        setViewModalVisible(false);
        setSelectedDoc(null);
      }
    } catch (e) {
      if (__DEV__) console.error('Error deleting document:', e);
    }
  };

  const openViewModal = (doc: PetDocument) => {
    setSelectedDoc(doc);
    setViewModalVisible(true);
  };

  const renderDocCard = ({ item }: { item: PetDocument }) => {
    const color = TYPE_COLORS[item.type];
    const icon = TYPE_ICONS[item.type];
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, ...Shadows.small }]}
        onPress={() => openViewModal(item)}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.photoUri }} style={styles.cardThumb} resizeMode="cover" />
        <View style={styles.cardBody}>
          <View style={[styles.typeRow, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={14} color={color} style={{ marginRight: 4 }} />
            <Text style={[styles.typeLabel, { color }]} numberOfLines={1}>
              {t(`documents.types.${item.type}`)}
            </Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.cardDate, { color: colors.text.secondary }]}>{item.date}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyDocs = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.text.light} />
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('documents.empty')}</Text>
      <Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>{t('documents.emptyMsg')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('documents.title')}</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Document grid */}
      {documents.length === 0 ? (
        <EmptyDocs />
      ) : (
        <FlatList
          data={documents}
          renderItem={renderDocCard}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, Shadows.medium]}
        onPress={openAddModal}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* ── Add Document Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity style={styles.headerBtn} onPress={closeAddModal}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('documents.add')}</Text>
            <TouchableOpacity
              style={[styles.saveBtn, { opacity: saving ? 0.6 : 1 }]}
              onPress={saveDocument}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('documents.titleLabel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }]}
              placeholder={t('documents.titlePlaceholder')}
              placeholderTextColor={colors.text.light}
              value={formTitle}
              onChangeText={setFormTitle}
            />

            {/* Type selector */}
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('documents.typeLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScrollRow}>
              {ALL_TYPES.map(type => {
                const selected = formType === type;
                const color = TYPE_COLORS[type];
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: selected ? color : color + '18',
                        borderColor: color,
                      },
                    ]}
                    onPress={() => setFormType(type)}
                  >
                    <Ionicons name={TYPE_ICONS[type]} size={14} color={selected ? '#fff' : color} style={{ marginRight: 4 }} />
                    <Text style={[styles.typeChipText, { color: selected ? '#fff' : color }]}>
                      {t(`documents.types.${type}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Photo */}
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('documents.addPhoto')}</Text>
            <TouchableOpacity
              style={[styles.photoPickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={pickPhoto}
              activeOpacity={0.8}
            >
              {formPhoto ? (
                <Image source={{ uri: formPhoto }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.text.light} />
                  <Text style={[styles.photoPlaceholderText, { color: colors.text.light }]}>
                    {t('documents.addPhoto')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Date */}
            <DatePickerInput
              label={t('reminder.dateLabel')}
              value={formDate}
              onChange={setFormDate}
            />

            {/* Note */}
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('documents.noteLabel')}</Text>
            <TextInput
              style={[
                styles.input,
                styles.noteInput,
                { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border },
              ]}
              placeholder={t('documents.notePlaceholder')}
              placeholderTextColor={colors.text.light}
              value={formNote}
              onChangeText={setFormNote}
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── View Document Modal ── */}
      <Modal
        visible={viewModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.viewOverlay}>
          <TouchableOpacity
            style={styles.viewClose}
            onPress={() => setViewModalVisible(false)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>

          {selectedDoc && (
            <>
              <Image
                source={{ uri: selectedDoc.photoUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <View style={styles.viewInfo}>
                <View style={styles.viewTitleRow}>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.typeRowSmall, { backgroundColor: TYPE_COLORS[selectedDoc.type] + '30' }]}>
                      <Ionicons name={TYPE_ICONS[selectedDoc.type]} size={13} color={TYPE_COLORS[selectedDoc.type]} style={{ marginRight: 4 }} />
                      <Text style={[styles.typeLabel, { color: TYPE_COLORS[selectedDoc.type] }]}>
                        {t(`documents.types.${selectedDoc.type}`)}
                      </Text>
                    </View>
                    <Text style={styles.viewTitle} numberOfLines={2}>{selectedDoc.title}</Text>
                    <Text style={styles.viewDate}>{selectedDoc.date}</Text>
                    {!!selectedDoc.note && (
                      <Text style={styles.viewNote}>{selectedDoc.note}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      setViewModalVisible(false);
                      setTimeout(() => confirmDelete(selectedDoc), 300);
                    }}
                  >
                    <Ionicons name="trash-outline" size={22} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  // List
  listContent: { padding: 12, paddingBottom: 100 },
  row: { gap: 12 },
  // Card
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardThumb: {
    width: '100%',
    height: 130,
    backgroundColor: '#e0e0e0',
  },
  cardBody: { padding: 10 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  typeRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  typeLabel: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardDate: { fontSize: 11 },
  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#40E0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal container
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#40E0D0',
    borderRadius: 20,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Form
  formScroll: { padding: 16, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  noteInput: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  typeScrollRow: { marginBottom: 4 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  photoPickerBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    borderStyle: 'dashed',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: { alignItems: 'center', gap: 8 },
  photoPlaceholderText: { fontSize: 14 },
  // View modal
  viewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  viewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '65%',
  },
  viewInfo: {
    padding: 20,
  },
  viewTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  viewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  viewDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 6,
  },
  viewNote: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
