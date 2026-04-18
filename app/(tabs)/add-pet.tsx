import React, { useState, useCallback, useRef } from 'react';
import {
  Text, TouchableOpacity, StyleSheet, Alert, View, Image,
  Platform, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPets } from '../../services/syncService';
import { showRewardedAd, preloadRewardedAd } from '../../services/adService';
import SupportModal from '../../components/SupportModal';
import NoticeModal from '../../components/NoticeModal';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGoBack } from '../../hooks/useGoBack';
import * as ImagePicker from 'expo-image-picker';
import { Pet } from '../../types/pet';
import { Theme } from '../../constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import AchievementUnlockModal from '../../components/AchievementUnlockModal';
import DatePickerInput from '../../components/DatePickerInput';
import BreedAutocomplete from '../../components/BreedAutocomplete';
import { useFormValidation } from '../../hooks/useFormValidation';
import { checkAndUnlockAchievements } from '../../hooks/useAchievements';
import { autoCompleteChallenge } from '../../hooks/useChallenges';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { uploadImage, deleteImage, isRemoteUrl } from '../../services/storageService';
import { supabase } from '../../services/supabase';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import ImagePickerSheet from '../../components/ImagePickerSheet';

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

const SPECIES_OPTIONS: { label: string; icon: MCIName; value: string }[] = [
  { label: 'Cachorro',  icon: 'dog',    value: 'Cachorro' },
  { label: 'Gato',      icon: 'cat',    value: 'Gato' },
  { label: 'Pássaro',   icon: 'bird',   value: 'Pássaro' },
  { label: 'Coelho',    icon: 'rabbit', value: 'Coelho' },
  { label: 'Hamster',   icon: 'rodent', value: 'Hamster' },
  { label: 'Peixe',     icon: 'fish',   value: 'Peixe' },
  { label: 'Réptil',    icon: 'snake',  value: 'Réptil' },
  { label: 'Cobaia',    icon: 'rodent', value: 'Cobaia' },
  { label: 'Chinchila', icon: 'rodent', value: 'Chinchila' },
  { label: 'Furão',     icon: 'paw',    value: 'Furão' },
  { label: 'Outro',     icon: 'paw',    value: 'Outro' },
];

const GENDER_OPTIONS = [
  { label: 'Macho', value: 'Macho', icon: 'male'   as const },
  { label: 'Fêmea', value: 'Fêmea', icon: 'female' as const },
];

export default function AddPetScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)');
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [name, setName]         = useState('');
  const [species, setSpecies]   = useState('');
  const [breed, setBreed]       = useState('');
  const [dob, setDob]           = useState<Date | null>(null);
  const [weight, setWeight]     = useState('');
  const [gender, setGender]     = useState('');
  const [castrated, setCastrated] = useState<boolean | null>(null);
  const [microchip, setMicrochip] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const tempPetId = React.useRef(`tmp_${Date.now()}`).current;
  const imageSheetRef = useRef<BottomSheetModal>(null);
  const [showSuccess, setShowSuccess]             = useState(false);
  const [unlockedAchievementId, setUnlockedAchievementId] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal]   = useState(false);
  const [adLoading, setAdLoading]                 = useState(false);
  const [notice, setNotice] = useState<{ type: 'info'|'warning'|'error'; title: string; message: string } | null>(null);
  const showNotice = (type: 'info'|'warning'|'error', title: string, message: string) =>
    setNotice({ type, title, message });

  const { validateAll, getFieldError, touchField, clearAllErrors } = useFormValidation({
    name:    { required: true, minLength: 2, maxLength: 50 },
    species: { required: true },
    breed:   { maxLength: 50 },
  });

  useFocusEffect(useCallback(() => {
    setName('');
    setSpecies('');
    setBreed('');
    setDob(null);
    setWeight('');
    setGender('');
    setCastrated(null);
    setMicrochip('');
    setPhotoUri(null);
    setShowSuccess(false);
    clearAllErrors();
    // Pré-carrega o anúncio recompensado enquanto o usuário preenche o formulário
    preloadRewardedAd();
  }, []));

  const pickImage = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showNotice('warning', t('addPet.permissionError'),
          useCamera ? t('addPet.cameraPermission') : t('addPet.galleryPermission'));
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        setPhotoUri(localUri);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const remoteUrl = await uploadImage(localUri, 'pets', `${user.id}/${tempPetId}`);
          setPhotoUri(remoteUrl);
        }
      }
    } catch {
      showNotice('error', t('common.error'), t('addPet.imageError'));
    }
  };

  const showImagePickerOptions = () => imageSheetRef.current?.present();

  const handleRemovePhoto = () => {
    if (photoUri && isRemoteUrl(photoUri)) deleteImage(photoUri, 'pets');
    setPhotoUri(null);
  };

  // Lógica central de salvar o pet (chamada após validação e anúncio)
  const doSavePet = async (newPet: Pet) => {
    try {
      const existingPetsJSON = await AsyncStorage.getItem('pets');
      const existingPets: Pet[] = existingPetsJSON ? JSON.parse(existingPetsJSON) : [];
      const isFirstPet = existingPets.length === 0;

      existingPets.push(newPet);
      await syncPets(existingPets);

      if (Platform.OS !== 'web' && newPet.dob) {
        try {
          const NS = await import('../../services/notificationService');
          await NS.scheduleBirthdayNotification(newPet.id, newPet.name, newPet.species, newPet.dob);
        } catch { /* notif opcional */ }
      }

      const [remJSON, vacJSON, weightJSON, streakJSON] = await Promise.all([
        AsyncStorage.getItem('reminders'),
        AsyncStorage.getItem('vaccinations'),
        AsyncStorage.getItem('weightRecords'),
        AsyncStorage.getItem('streakData'),
      ]);
      const newlyUnlocked = await checkAndUnlockAchievements({
        pets: existingPets,
        reminders: remJSON ? JSON.parse(remJSON) : [],
        vaccines: vacJSON ? JSON.parse(vacJSON) : [],
        weightRecords: weightJSON ? JSON.parse(weightJSON) : [],
        streak: streakJSON ? JSON.parse(streakJSON) : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 },
      });

      await autoCompleteChallenge('add_pet');
      if (newlyUnlocked.length > 0) setUnlockedAchievementId(newlyUnlocked[0]);

      setShowSuccess(true);
      setTimeout(() => {
        try {
          if (isFirstPet) router.replace('/(tabs)/profile');
          else router.back();
        } catch (navErr) {
          if (__DEV__) console.error('Erro de navegação ao salvar pet:', navErr);
        }
      }, 2000);
    } catch {
      showNotice('error', t('common.error'), t('addPet.saveError'));
    }
  };

  const buildNewPet = (): Pet => {
    const formattedDob = dob
      ? `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`
      : '';
    return {
      id: Date.now().toString(),
      name: name.trim().slice(0, 60),
      species: species.trim().slice(0, 40),
      breed: breed.trim().slice(0, 60),
      dob: formattedDob,
      gender: gender || undefined,
      weight: weight ? parseFloat(weight.replace(',', '.')) : undefined,
      castrated: castrated ?? undefined,
      microchip: microchip.trim() || undefined,
      photoUri: photoUri || undefined,
    };
  };

  const handleSavePet = async () => {
    const isValid = validateAll({ name, species, breed });
    if (!isValid) {
      showNotice('warning', t('common.attention'), t('addPet.validationError'));
      return;
    }

    const existingPetsJSON = await AsyncStorage.getItem('pets');
    const existingPets: Pet[] = existingPetsJSON ? JSON.parse(existingPetsJSON) : [];

    // A partir do 3º pet, mostra modal de suporte antes de salvar
    if (existingPets.length >= 2) {
      setShowSupportModal(true);
      return;
    }

    await doSavePet(buildNewPet());
  };

  // Handler: usuário quer assistir o anúncio
  const handleWatchAd = async () => {
    setAdLoading(true);
    let rewarded = false;
    try {
      rewarded = await showRewardedAd();
    } catch {
      rewarded = false;
    }
    setAdLoading(false);
    setShowSupportModal(false);
    if (rewarded) {
      await doSavePet(buildNewPet());
    }
    // Se não assistiu, modal fecha e o usuário pode tentar de novo
  };


  const selectedSpeciesData = SPECIES_OPTIONS.find(s => s.value === species);

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {t('addPet.title')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Upload */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={[styles.avatarWrap, { backgroundColor: Theme.primary + '22' }]}
            onPress={showImagePickerOptions}
            activeOpacity={0.8}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <>
                {selectedSpeciesData ? (
                  <MaterialCommunityIcons name={selectedSpeciesData.icon} size={44} color={Theme.primary} />
                ) : (
                  <Ionicons name="camera" size={32} color={Theme.primary} />
                )}
                <Text style={styles.avatarHint}>{t('addPet.addPhoto')}</Text>
              </>
            )}
          </TouchableOpacity>
          {!!photoUri && (
            <TouchableOpacity
              style={[styles.removePhoto, { backgroundColor: colors.surface }]}
              onPress={() => setPhotoUri(null)}
            >
              <Ionicons name="close-circle" size={28} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Nome do Pet */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
            {t('addPet.nameLabel')}{' '}
            <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <View style={[
            styles.inputRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
            !!getFieldError('name') && { borderColor: colors.danger },
          ]}>
            <Ionicons name="paw-outline" size={18} color={colors.text.light} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.text.primary }]}
              placeholder={t('addPet.namePlaceholder')}
              placeholderTextColor={colors.text.light}
              value={name}
              onChangeText={setName}
              onBlur={() => touchField('name')}
              autoCapitalize="words"
            />
          </View>
          {!!getFieldError('name') && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{getFieldError('name')}</Text>
          )}
        </View>

        {/* Espécie */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
            {t('addPet.speciesLabel')}{' '}
            <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          {!!getFieldError('species') && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{getFieldError('species')}</Text>
          )}
          <View style={styles.speciesGrid}>
            {SPECIES_OPTIONS.map(opt => {
              const selected = species === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.speciesChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selected && { backgroundColor: Theme.primary + '20', borderColor: Theme.primary },
                  ]}
                  onPress={() => { setSpecies(opt.value); touchField('species'); }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={26}
                    color={selected ? Theme.primary : colors.text.light}
                  />
                  <Text style={[
                    styles.speciesLabel,
                    { color: selected ? Theme.primary : colors.text.light },
                    selected && { fontWeight: '700' },
                  ]}>
                    {t(`addPet.species.${opt.value}`) || opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Raça */}
        <View style={[styles.fieldGroup, styles.fieldGroupBreed]}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
            {t('addPet.breedLabel')}
          </Text>
          <BreedAutocomplete
            species={species}
            value={breed}
            onChangeText={setBreed}
            onBlur={() => touchField('breed')}
            error={getFieldError('breed')}
          />
        </View>

        {/* Data de Nascimento + Peso */}
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <DatePickerInput
              label={t('addPet.dobLabel') || 'Data de Nascimento'}
              value={dob}
              onChange={setDob}
              placeholder={t('addPet.dobPlaceholder') || 'DD/MM/AAAA'}
              maximumDate={new Date()}
            />
          </View>
          <View style={styles.rowFieldSpacer} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
              {t('addPet.weightLabel')}
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="scale-outline" size={18} color={colors.text.light} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputText, { color: colors.text.primary }]}
                placeholder="0,0"
                placeholderTextColor={colors.text.light}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Sexo */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>
            {t('addPet.genderLabel')}
          </Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map(opt => {
              const selected = gender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.genderBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selected && { backgroundColor: Theme.primary + '20', borderColor: Theme.primary },
                  ]}
                  onPress={() => setGender(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={selected ? Theme.primary : colors.text.light}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[
                    styles.genderLabel,
                    { color: selected ? Theme.primary : colors.text.secondary },
                    selected && { fontWeight: '700' },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Castrado */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>{t('addPet.castratedLabel')}</Text>
          <View style={styles.genderRow}>
            {[{ label: 'Sim', value: true }, { label: 'Não', value: false }].map(opt => {
              const selected = castrated === opt.value;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.genderBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selected && { backgroundColor: Theme.primary + '20', borderColor: Theme.primary },
                  ]}
                  onPress={() => setCastrated(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.genderLabel,
                    { color: selected ? Theme.primary : colors.text.secondary },
                    selected && { fontWeight: '700' },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Microchip */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>{t('addPet.microchipLabel')}</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="barcode-outline" size={18} color={colors.text.light} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.text.primary }]}
              placeholder="Ex: BR-9281742"
              placeholderTextColor={colors.text.light}
              value={microchip}
              onChangeText={setMicrochip}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Botão Salvar */}
        <AnimatedButton style={styles.saveBtn} onPress={handleSavePet}>
          <Text style={styles.saveBtnText}>
            {t('addPet.saveBtn') || 'Salvar Pet'}
          </Text>
        </AnimatedButton>
      </ScrollView>

      <SuccessAnimation visible={showSuccess} onAnimationEnd={() => setShowSuccess(false)} />
      <AchievementUnlockModal
        achievementId={unlockedAchievementId}
        onClose={() => setUnlockedAchievementId(null)}
      />
      <SupportModal
        visible={showSupportModal}
        loading={adLoading}
        onWatchAd={handleWatchAd}
        onClose={() => setShowSupportModal(false)}
      />
      <NoticeModal
        visible={notice !== null}
        type={notice?.type ?? 'warning'}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        onConfirm={() => setNotice(null)}
      />
      <ImagePickerSheet
        ref={imageSheetRef}
        hasPhoto={!!photoUri}
        onCamera={() => pickImage(true)}
        onGallery={() => pickImage(false)}
        onRemove={handleRemovePhoto}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' },

  // Scroll
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28, position: 'relative' },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarHint: { fontSize: 11, color: Theme.primary, marginTop: 4, fontWeight: '500' },
  removePhoto: {
    position: 'absolute',
    bottom: 0,
    right: '50%',
    marginRight: -64,
    borderRadius: 14,
  },

  // Field
  fieldGroup: { marginBottom: 20 },
  fieldGroupBreed: { zIndex: 200 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  errorText: { fontSize: 12, marginBottom: 4, marginLeft: 2 },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: 14, padding: 0 },

  // Espécie grid
  speciesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  speciesChip: {
    width: '22%',
    minWidth: 68,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    margin: 4,
  },
  speciesLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },

  // Row fields (data + peso)
  rowFields: { flexDirection: 'row', marginBottom: 4 },
  rowFieldSpacer: { width: 12 },

  // Sexo
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  genderLabel: { fontSize: 14, fontWeight: '500' },

  // Botão salvar
  saveBtn: {
    height: 52,
    backgroundColor: Theme.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
