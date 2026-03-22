import React, { useState, useEffect } from 'react';
import {
  Text, StyleSheet, Alert, View, TouchableOpacity,
  ScrollView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useGoBack } from '../../hooks/useGoBack';
import * as ImagePicker from 'expo-image-picker';
import { Pet } from '../../types/pet';
import { Theme } from '../../constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import DatePickerInput from '../../components/DatePickerInput';
import ValidatedInput from '../../components/ValidatedInput';
import BreedAutocomplete from '../../components/BreedAutocomplete';
import TagInput from '../../components/TagInput';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { createWebShadow } from '../../constants/WebShadows';

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

const SPECIES_OPTIONS: { label: string; icon: MCIName; value: string }[] = [
  { label: 'Cachorro', icon: 'dog',    value: 'Cachorro' },
  { label: 'Gato',     icon: 'cat',    value: 'Gato' },
  { label: 'Pássaro',  icon: 'bird',   value: 'Pássaro' },
  { label: 'Coelho',   icon: 'rabbit', value: 'Coelho' },
  { label: 'Hamster',  icon: 'rodent', value: 'Hamster' },
  { label: 'Peixe',    icon: 'fish',   value: 'Peixe' },
  { label: 'Réptil',   icon: 'snake',  value: 'Réptil' },
  { label: 'Outro',    icon: 'paw',    value: 'Outro' },
];

export default function EditPetScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)');
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [medAllergies, setMedAllergies] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const { validateAll, getFieldError, touchField } = useFormValidation({
    name:    { required: true, minLength: 2, maxLength: 50 },
    species: { required: true },
    breed:   { maxLength: 50 },
  });

  const loadPetData = React.useCallback(async () => {
    try {
      const petsJSON = await AsyncStorage.getItem('pets');
      if (petsJSON) {
        const pets: Pet[] = JSON.parse(petsJSON);
        const pet = pets.find(p => p.id === id);
        if (pet) {
          setName(pet.name);
          setSpecies(pet.species);
          setBreed(pet.breed || '');
          setPhotoUri(pet.photoUri || null);
          setFoodAllergies(pet.foodAllergies ?? []);
          setMedAllergies(pet.medAllergies ?? []);
          setRestrictions(pet.restrictions ?? '');
          if (pet.dob) {
            const parts = pet.dob.split('/');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              setDob(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }
          }
        }
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('addPet.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPetData(); }, [loadPetData]);

  const pickImage = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t('addPet.permissionError'),
          `${useCamera ? t('addPet.cameraPermission') : t('addPet.galleryPermission')}`
        );
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
    Alert.alert(t('addPet.changePhoto'), t('addPet.photoOptions'), [
      { text: t('addPet.camera'), onPress: () => setTimeout(() => pickImage(true), 300) },
      { text: t('addPet.gallery'), onPress: () => setTimeout(() => pickImage(false), 300) },
      { text: t('addPet.removePhoto'), onPress: () => setPhotoUri(null), style: 'destructive' },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleUpdatePet = async () => {
    const isValid = validateAll({ name, species, breed });
    if (!isValid) {
      Alert.alert(t('common.attention'), t('addPet.validationError'));
      return;
    }
    if (!dob) {
      Alert.alert(t('common.attention'), t('addPet.dobRequired'));
      return;
    }

    try {
      const petsJSON = await AsyncStorage.getItem('pets');
      let pets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
      const petIndex = pets.findIndex(p => p.id === id);
      if (petIndex === -1) {
        Alert.alert(t('common.error'), t('petDetail.petNotFound'));
        return;
      }

      const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;

      pets[petIndex] = {
        ...pets[petIndex],
        name: name.trim(),
        species: species.trim(),
        breed: breed.trim(),
        dob: formattedDob,
        photoUri: photoUri ?? undefined,
        foodAllergies: foodAllergies.length > 0 ? foodAllergies : undefined,
        medAllergies: medAllergies.length > 0 ? medAllergies : undefined,
        restrictions: restrictions.trim() || undefined,
      };

      await AsyncStorage.setItem('pets', JSON.stringify(pets));

      // Re-agendar notificação de aniversário com dados atualizados
      const savedPet = pets[petIndex];
      if (Platform.OS !== 'web' && savedPet?.dob) {
        try {
          const NS = await import('../../services/notificationService');
          await NS.scheduleBirthdayNotification(
            savedPet.id,
            savedPet.name,
            savedPet.species,
            savedPet.dob,
          );
        } catch { /* notif opcional */ }
      }

      setShowSuccess(true);
    } catch {
      Alert.alert(t('common.error'), t('addPet.updateError'));
    }
  };

  const handleDeletePet = () => {
    Alert.alert(
      t('addPet.deleteTitle'),
      t('addPet.deleteConfirm', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const petsJSON = await AsyncStorage.getItem('pets');
              let pets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
              pets = pets.filter(p => p.id !== id);
              await AsyncStorage.setItem('pets', JSON.stringify(pets));
              router.replace('/(tabs)');
            } catch {
              Alert.alert(t('common.error'), t('addPet.deleteError'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  const selectedSpeciesData = SPECIES_OPTIONS.find(s => s.value === species);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('addPet.editTitle')}</Text>
        <TouchableOpacity onPress={handleDeletePet} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={22} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Foto */}
        <View style={styles.photoContainer}>
          <TouchableOpacity
            style={[styles.photoButton, {
              backgroundColor: colors.surface,
              ...(Platform.OS === 'web'
                ? { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }
                : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }),
            }]}
            onPress={showImagePickerOptions}
            activeOpacity={0.8}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.petPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                {selectedSpeciesData ? (
                  <MaterialCommunityIcons name={selectedSpeciesData.icon} size={52} color={Theme.primary} />
                ) : (
                  <Ionicons name="camera" size={40} color={colors.text.light} />
                )}
                <Text style={[styles.photoPlaceholderText, { color: colors.text.light }]}>
                  {t('addPet.changePhoto')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {!!photoUri && (
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
              <Ionicons name="close-circle" size={32} color="#F44336" />
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

        {/* Espécie */}
        <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>
          {t('addPet.speciesLabel')} <Text style={{ color: Theme.danger }}>*</Text>
        </Text>
        {!!getFieldError('species') && (
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
          label={`${t('addPet.dobLabel')} *`}
          value={dob}
          onChange={setDob}
          placeholder={t('addPet.dobPlaceholder')}
          maximumDate={new Date()}
        />

        {/* Alergias e Restrições */}
        <View style={[styles.allergiesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.allergiesHeader}>
            <Ionicons name="alert-circle-outline" size={20} color="#FF9800" />
            <Text style={[styles.allergiesSectionTitle, { color: colors.text.primary }]}>
              {t('allergies.title')}
            </Text>
          </View>
          <TagInput
            label={t('allergies.food')}
            tags={foodAllergies}
            onChange={setFoodAllergies}
            placeholder={t('allergies.foodPlaceholder')}
            color="#FF5722"
          />
          <TagInput
            label={t('allergies.med')}
            tags={medAllergies}
            onChange={setMedAllergies}
            placeholder={t('allergies.medPlaceholder')}
            color="#9C27B0"
          />
          <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{t('allergies.restrictions')}</Text>
          <ValidatedInput
            iconName="document-text-outline"
            placeholder={t('allergies.restrictionsPlaceholder')}
            value={restrictions}
            onChangeText={setRestrictions}
            multiline
          />
        </View>

        {/* Salvar */}
        <AnimatedButton
          style={styles.saveButton}
          onPress={handleUpdatePet}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Salvar Alterações</Text>
        </AnimatedButton>
      </ScrollView>

      <SuccessAnimation
        visible={showSuccess}
        onAnimationEnd={() => { setShowSuccess(false); goBack(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  deleteBtn: { width: 40, alignItems: 'flex-end' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  // Foto
  photoContainer: { alignItems: 'center', marginBottom: 28, position: 'relative' },
  photoButton: {
    width: 140, height: 140, borderRadius: 70, overflow: 'hidden',
  },
  petPhoto: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  photoPlaceholderText: { fontSize: 13, marginTop: 6 },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: '50%',
    marginRight: -80,
    borderRadius: 16,
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
    borderRadius: 12,
    borderWidth: 1.5,
    margin: 5,
  },
  speciesChipIcon: { marginBottom: 4 },
  speciesLabel: { fontSize: 11, textAlign: 'center' },
  // Alergias
  allergiesSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  allergiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  allergiesSectionTitle: { fontSize: 16, fontWeight: '700' },
  // Botão
  saveButton: {
    backgroundColor: Theme.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    ...createWebShadow('primary', '0 4px 12px rgba(64,224,208,0.4)'),
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
