import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert, View, Image, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useGoBack } from '../../hooks/useGoBack';
import * as ImagePicker from 'expo-image-picker';
import { Pet } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import DatePickerInput from '../../components/DatePickerInput';
import ValidatedInput from '../../components/ValidatedInput';
import BreedAutocomplete from '../../components/BreedAutocomplete';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useTheme } from '../../hooks/useTheme';
import { checkAndUnlockAchievements } from '../../hooks/useAchievements';
import { autoCompleteChallenge } from '../../hooks/useChallenges';
import { useTranslation } from 'react-i18next';

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

const SPECIES_OPTIONS: { label: string; icon: MCIName; value: string }[] = [
  { label: 'Cachorro', icon: 'dog',     value: 'Cachorro' },
  { label: 'Gato',     icon: 'cat',     value: 'Gato' },
  { label: 'Pássaro',  icon: 'bird',    value: 'Pássaro' },
  { label: 'Coelho',   icon: 'rabbit',  value: 'Coelho' },
  { label: 'Hamster',  icon: 'rodent',  value: 'Hamster' },
  { label: 'Peixe',    icon: 'fish',    value: 'Peixe' },
  { label: 'Réptil',   icon: 'snake',   value: 'Réptil' },
  { label: 'Outro',    icon: 'paw',     value: 'Outro' },
];

export default function AddPetScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)');
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { validateAll, getFieldError, touchField } = useFormValidation({
    name:    { required: true, minLength: 2, maxLength: 50 },
    species: { required: true },
    breed:   { maxLength: 50 },
  });

  const pickImage = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(t('addPet.permissionError'), `${useCamera ? t('addPet.cameraPermission') : t('addPet.galleryPermission')}`);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(t('common.error'), t('addPet.imageError'));
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(t('addPet.addPhotoTitle'), t('addPet.photoOptions'), [
      { text: t('addPet.camera'), onPress: () => setTimeout(() => pickImage(true), 300) },
      { text: t('addPet.gallery'), onPress: () => setTimeout(() => pickImage(false), 300) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleSavePet = async () => {
    const isValid = validateAll({ name, species, breed });
    if (!isValid) {
      Alert.alert(t('common.attention'), t('addPet.validationError'));
      return;
    }

    const formattedDob = dob
      ? `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`
      : '';

    const newPet: Pet = {
      id: Date.now().toString(),
      name,
      species,
      breed,
      dob: formattedDob,
      photoUri: photoUri || undefined,
    };

    try {
      const existingPetsJSON = await AsyncStorage.getItem('pets');
      const existingPets: Pet[] = existingPetsJSON ? JSON.parse(existingPetsJSON) : [];
      const isFirstPet = existingPets.length === 0;

      existingPets.push(newPet);
      await AsyncStorage.setItem('pets', JSON.stringify(existingPets));

      // Agendar notificação de aniversário
      if (Platform.OS !== 'web' && newPet.dob) {
        try {
          const NS = await import('../../services/notificationService');
          await NS.scheduleBirthdayNotification(newPet.id, newPet.name, newPet.species, newPet.dob);
        } catch { /* notif opcional */ }
      }

      // Verificar conquistas
      const [remJSON, vacJSON, weightJSON, streakJSON] = await Promise.all([
        AsyncStorage.getItem('reminders'),
        AsyncStorage.getItem('vaccinations'),
        AsyncStorage.getItem('weightRecords'),
        AsyncStorage.getItem('streakData'),
      ]);
      await checkAndUnlockAchievements({
        pets: existingPets,
        reminders: remJSON ? JSON.parse(remJSON) : [],
        vaccines: vacJSON ? JSON.parse(vacJSON) : [],
        weightRecords: weightJSON ? JSON.parse(weightJSON) : [],
        streak: streakJSON ? JSON.parse(streakJSON) : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 },
      });

      await autoCompleteChallenge('add_pet');

      setShowSuccess(true);
      setTimeout(() => {
        try {
          if (isFirstPet) {
            router.replace('/(tabs)/profile');
          } else {
            router.back();
          }
        } catch (navErr) {
          console.error('Erro de navegação ao salvar pet:', navErr);
        }
      }, 2000);
    } catch (err) {
      Alert.alert(t('common.error'), t('addPet.saveError'));
    }
  };

  const selectedSpeciesData = SPECIES_OPTIONS.find(s => s.value === species);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header com botão voltar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>{t('addPet.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Foto */}
        <View style={styles.photoContainer}>
          <TouchableOpacity
            style={[styles.photoButton, { backgroundColor: colors.surface }]}
            onPress={showImagePickerOptions}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.petPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                {selectedSpeciesData ? (
                  <MaterialCommunityIcons name={selectedSpeciesData.icon} size={52} color={Theme.primary} style={styles.photoPlaceholderIcon} />
                ) : (
                  <Ionicons name="camera" size={40} color={colors.text.light} style={styles.photoPlaceholderIcon} />
                )}
                <Text style={[styles.photoPlaceholderText, { color: colors.text.light }]}>
                  {t('addPet.addPhoto')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {!!photoUri && (
            <TouchableOpacity style={styles.removePhotoButton} onPress={() => setPhotoUri(null)}>
              <Ionicons name="close-circle" size={32} color={Theme.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Nome */}
        <ValidatedInput
          iconName="pencil"
          placeholder={t('addPet.namePlaceholder')}
          value={name}
          onChangeText={setName}
          onBlur={() => touchField('name')}
          error={getFieldError('name')}
          required
        />

        {/* Seletor de Espécie */}
        <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>
          {t('addPet.speciesLabel')} <Text style={{ color: Theme.danger }}>*</Text>
        </Text>
        {getFieldError('species') && (
          <Text style={styles.fieldError}>{getFieldError('species')}</Text>
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
                  size={28}
                  color={selected ? Theme.primary : colors.text.secondary}
                  style={styles.speciesChipIcon}
                />
                <Text style={[
                  styles.speciesLabel,
                  { color: selected ? Theme.primary : colors.text.secondary },
                  selected && { fontWeight: '700' },
                ]}>
                  {t(`addPet.species.${opt.value}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Raça */}
        <BreedAutocomplete
          species={species}
          value={breed}
          onChangeText={setBreed}
          onBlur={() => touchField('breed')}
          error={getFieldError('breed')}
        />

        {/* Data de Nascimento */}
        <DatePickerInput
          label={t('addPet.dobLabel')}
          value={dob}
          onChange={setDob}
          placeholder={t('addPet.dobPlaceholder')}
          maximumDate={new Date()}
        />

        {/* Botão Salvar */}
        <AnimatedButton style={styles.button} onPress={handleSavePet}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>{t('addPet.saveBtn')}</Text>
        </AnimatedButton>
      </ScrollView>

      <SuccessAnimation visible={showSuccess} onAnimationEnd={() => setShowSuccess(false)} />
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
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  // Foto
  photoContainer: { alignItems: 'center', marginBottom: 28, position: 'relative' },
  photoButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  petPhoto: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  photoPlaceholderIcon: { marginBottom: 6 },
  photoPlaceholderText: { fontSize: 13 },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: '50%',
    marginRight: -80,
    backgroundColor: '#fff',
    borderRadius: 16,
    ...Shadows.small,
  },
  // Espécie
  sectionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  fieldError: { color: '#DC3545', fontSize: 12, marginBottom: 6, marginLeft: 2 },
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    marginHorizontal: -5,
  },
  speciesChip: {
    width: '22%',
    minWidth: 72,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    margin: 5,
  },
  speciesChipIcon: { marginBottom: 4 },
  speciesLabel: { fontSize: 11, textAlign: 'center' },
  // Botão
  button: {
    backgroundColor: Theme.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  buttonIcon: { marginRight: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
