import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Image,
  ScrollView, Platform, TextInput as RNTextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useGoBack } from '../../hooks/useGoBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { UserProfile } from '../../types/pet';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../hooks/useTheme';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import { useTranslation } from 'react-i18next';

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

const getInitials = (name: string): string =>
  name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const EXPERIENCE_OPTIONS: { value: UserProfile['experience']; icon: MCIName; labelKey: string }[] = [
  { value: 'beginner',     icon: 'sprout',        labelKey: 'editProfile.exp.beginner' },
  { value: 'intermediate', icon: 'paw',            labelKey: 'editProfile.exp.intermediate' },
  { value: 'expert',       icon: 'trophy-outline', labelKey: 'editProfile.exp.expert' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)');
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [name, setName]           = useState('');
  const [bio, setBio]             = useState('');
  const [phone, setPhone]         = useState('');
  const [city, setCity]           = useState('');
  const [state, setState]         = useState('');
  const [cep, setCep]             = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [experience, setExperience] = useState<UserProfile['experience']>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [showSuccess, setShowSuccess] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userProfile').then(json => {
      if (!json) return;
      const p: UserProfile = JSON.parse(json);
      setName(p.name || '');
      setBio(p.bio || '');
      setPhone(p.phone || '');
      setCity(p.city || '');
      setState(p.state || '');
      setCep(p.cep || '');
      setBirthDate(p.birthDate || '');
      setExperience(p.experience);
      setAvatarUrl(p.avatarUrl);
    });
  }, []);

  const pickAvatar = async (useCamera: boolean) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('editProfile.permissionRequired'), useCamera ? t('editProfile.permissionCamera') : t('editProfile.permissionGallery'));
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!result.canceled && result.assets[0]) setAvatarUrl(result.assets[0].uri);
    } catch {
      Alert.alert(t('common.error'), t('editProfile.imageError'));
    }
  };

  const showAvatarOptions = () => {
    Alert.alert(t('editProfile.avatarOptions'), t('editProfile.avatarOptionsMsg'), [
      { text: t('editProfile.camera'),  onPress: () => setTimeout(() => pickAvatar(true), 300) },
      { text: t('editProfile.gallery'), onPress: () => setTimeout(() => pickAvatar(false), 300) },
      ...(avatarUrl ? [{ text: t('editProfile.removePhoto'), style: 'destructive' as const, onPress: () => setAvatarUrl(undefined) }] : []),
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  // Formata data enquanto digita: DD/MM/YYYY
  const handleBirthDateChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    setBirthDate(formatted);
  };

  const handleCepChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    setCep(digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits);
  };

  const handleStateChange = (text: string) => {
    setState(text.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase());
  };

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2)  formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
    if (digits.length > 7)  formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
    setPhone(formatted);
    if (phoneError) setPhoneError('');
  };

  const handleSave = async () => {
    let valid = true;
    if (!name.trim()) { setNameError(t('editProfile.nameRequired')); valid = false; }
    else if (name.trim().length < 2) { setNameError(t('editProfile.nameMinLength')); valid = false; }
    else setNameError('');

    if (phone && phone.replace(/\D/g, '').length < 10) {
      setPhoneError(t('editProfile.phoneInvalid')); valid = false;
    } else setPhoneError('');

    if (!valid) return;

    const newProfile: UserProfile = {
      name: name.trim(),
      bio: bio.trim(),
      phone: phone.trim(),
      city: city.trim(),
      state: state.trim(),
      cep: cep.trim(),
      birthDate: birthDate.trim(),
      experience,
      avatarUrl,
    };

    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
      setShowSuccess(true);
      setTimeout(() => { try { goBack(); } catch {} }, 1800);
    } catch {
      Alert.alert(t('common.error'), t('editProfile.saveError'));
    }
  };

  const displayName = name.trim() || t('editProfile.defaultName');
  const initials = getInitials(displayName);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('editProfile.title')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={showAvatarOptions} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: Theme.primary }]}>
              {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                : <Text style={styles.avatarInitials}>{initials}</Text>
              }
            </View>
            <View style={[styles.avatarEditBadge, { backgroundColor: Theme.primary }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.text.light }]}>{t('editProfile.avatarHint')}</Text>
        </View>

        {/* ── Seção: Informações Básicas ── */}
        <SectionLabel label={t('editProfile.sectionBasic')} colors={colors} />

        {/* Nome */}
        <FieldGroup label={t('editProfile.nameLabel')} required error={nameError} charCount={`${name.length}/50`}>
          <InputRow icon="person-outline" colors={colors} error={!!nameError}>
            <RNTextInput
              value={name}
              onChangeText={v => { setName(v); if (nameError) setNameError(''); }}
              placeholder={t('editProfile.namePlaceholder')}
              placeholderTextColor={colors.text.light}
              style={[styles.textInput, { color: colors.text.primary }]}
              autoCapitalize="words"
              maxLength={50}
            />
          </InputRow>
        </FieldGroup>

        {/* Bio */}
        <FieldGroup label={t('editProfile.bioLabel')} charCount={`${bio.length}/150`}>
          <InputRow icon="chatbubble-outline" colors={colors} multiline>
            <RNTextInput
              value={bio}
              onChangeText={setBio}
              placeholder={t('editProfile.bioPlaceholder')}
              placeholderTextColor={colors.text.light}
              style={[styles.textInput, styles.textInputMultiline, { color: colors.text.primary }]}
              multiline
              numberOfLines={3}
              maxLength={150}
              autoCapitalize="sentences"
            />
          </InputRow>
        </FieldGroup>

        {/* ── Seção: Contato ── */}
        <SectionLabel label={t('editProfile.sectionContact')} colors={colors} />

        {/* Telefone */}
        <FieldGroup label={t('editProfile.phoneLabel')} error={phoneError}>
          <InputRow icon="call-outline" colors={colors} error={!!phoneError}>
            <RNTextInput
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder={t('editProfile.phonePlaceholder')}
              placeholderTextColor={colors.text.light}
              style={[styles.textInput, { color: colors.text.primary }]}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </InputRow>
        </FieldGroup>

        {/* Cidade + Estado na mesma linha */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FieldGroup label={t('editProfile.cityLabel')}>
              <InputRow icon="location-outline" colors={colors}>
                <RNTextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder={t('editProfile.cityPlaceholder')}
                  placeholderTextColor={colors.text.light}
                  style={[styles.textInput, { color: colors.text.primary }]}
                  autoCapitalize="words"
                  maxLength={60}
                />
              </InputRow>
            </FieldGroup>
          </View>
          <View style={{ width: 80 }}>
            <FieldGroup label={t('editProfile.stateLabel')}>
              <InputRow icon="flag-outline" colors={colors}>
                <RNTextInput
                  value={state}
                  onChangeText={handleStateChange}
                  placeholder="UF"
                  placeholderTextColor={colors.text.light}
                  style={[styles.textInput, { color: colors.text.primary }]}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </InputRow>
            </FieldGroup>
          </View>
        </View>

        {/* CEP */}
        <FieldGroup label={t('editProfile.cepLabel')}>
          <InputRow icon="mail-outline" colors={colors}>
            <RNTextInput
              value={cep}
              onChangeText={handleCepChange}
              placeholder="00000-000"
              placeholderTextColor={colors.text.light}
              style={[styles.textInput, { color: colors.text.primary }]}
              keyboardType="numeric"
              maxLength={9}
            />
          </InputRow>
        </FieldGroup>

        {/* ── Seção: Sobre você ── */}
        <SectionLabel label={t('editProfile.sectionAbout')} colors={colors} />

        {/* Data de nascimento */}
        <FieldGroup label={t('editProfile.birthDateLabel')}>
          <InputRow icon="calendar-outline" colors={colors}>
            <RNTextInput
              value={birthDate}
              onChangeText={handleBirthDateChange}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.text.light}
              style={[styles.textInput, { color: colors.text.primary }]}
              keyboardType="numeric"
              maxLength={10}
            />
          </InputRow>
        </FieldGroup>

        {/* Nível de experiência */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('editProfile.expLabel')}</Text>
          <View style={styles.expGrid}>
            {EXPERIENCE_OPTIONS.map(opt => {
              const active = experience === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.expChip,
                    { backgroundColor: active ? Theme.primary + '20' : colors.surface, borderColor: active ? Theme.primary : colors.border },
                  ]}
                  onPress={() => setExperience(opt.value)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name={opt.icon} size={22} color={active ? Theme.primary : colors.text.secondary} />
                  <Text style={[styles.expChipText, { color: active ? Theme.primary : colors.text.secondary, fontWeight: active ? '700' : '400' }]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preview */}
        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.previewHeader}>
            <MaterialCommunityIcons name="eye-outline" size={15} color={colors.text.secondary} />
            <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>{t('editProfile.previewLabel')}</Text>
          </View>
          <View style={styles.previewContent}>
            <View style={[styles.previewAvatar, { backgroundColor: Theme.primary }]}>
              {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={styles.previewAvatarImage} />
                : <Text style={styles.previewInitials}>{initials}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewName, { color: colors.text.primary }]} numberOfLines={1}>
                {name.trim() || t('editProfile.defaultName')}
              </Text>
              {!!city && (
                <View style={styles.previewRow}>
                  <Ionicons name="location-outline" size={11} color={colors.text.light} />
                  <Text style={[styles.previewMeta, { color: colors.text.light }]}> {city}</Text>
                </View>
              )}
              {!!experience && (
                <View style={styles.previewRow}>
                  <MaterialCommunityIcons
                    name={EXPERIENCE_OPTIONS.find(e => e.value === experience)?.icon ?? 'paw'}
                    size={11}
                    color={Theme.primary}
                  />
                  <Text style={[styles.previewMeta, { color: Theme.primary }]}> {t(`editProfile.exp.${experience}`)}</Text>
                </View>
              )}
              <Text style={[styles.previewBio, { color: colors.text.secondary }]} numberOfLines={2}>
                {bio.trim() || t('editProfile.defaultBio')}
              </Text>
            </View>
          </View>
        </View>

        {/* Salvar */}
        <AnimatedButton style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>{t('editProfile.saveBtn')}</Text>
        </AnimatedButton>

      </ScrollView>
      <SuccessAnimation visible={showSuccess} onAnimationEnd={() => setShowSuccess(false)} />
    </SafeAreaView>
  );
}

// ── Subcomponentes locais ──────────────────────────────────────────────────────

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={[sectionLabelStyles.wrap, { borderBottomColor: colors.border }]}>
      <Text style={[sectionLabelStyles.text, { color: colors.text.secondary }]}>{label.toUpperCase()}</Text>
    </View>
  );
}
const sectionLabelStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 4, paddingBottom: 8, marginBottom: 16, borderBottomWidth: 1 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});

function FieldGroup({ label, required, error, charCount, children }: {
  label: string; required?: boolean; error?: string; charCount?: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Text style={[styles.label, { color: '#000' }]}>{label} </Text>
        {required && <Text style={[styles.label, { color: Theme.danger }]}>*</Text>}
      </View>
      {children}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {!!charCount && <Text style={styles.charCount}>{charCount}</Text>}
    </View>
  );
}

function InputRow({ icon, colors, error, multiline, children }: {
  icon: string; colors: any; error?: boolean; multiline?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={[
      styles.inputRow,
      multiline && styles.inputMultiline,
      { backgroundColor: colors.surface, borderColor: error ? Theme.danger : colors.border },
    ]}>
      <Ionicons name={icon as any} size={20} color={colors.text.secondary} style={[styles.inputIcon, multiline && { alignSelf: 'flex-start', marginTop: 14 }]} />
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
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    ...Shadows.medium,
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarInitials: { fontSize: 34, fontWeight: 'bold', color: '#fff' },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarHint: { fontSize: 13 },

  // Campos
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, ...Shadows.small,
  },
  inputMultiline: { alignItems: 'flex-start' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, paddingVertical: 13 },
  textInputMultiline: { paddingVertical: 12, minHeight: 80, textAlignVertical: 'top' },
  errorText: { color: Theme.danger, fontSize: 12, marginTop: 4, marginLeft: 2 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4, color: '#9E9E9E' },

  // Nível de experiência
  expGrid: { flexDirection: 'row', gap: 8 },
  expChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1.5, gap: 6,
  },
  expChipText: { fontSize: 12, textAlign: 'center' },

  // Preview
  previewCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  previewLabel: { fontSize: 12, fontWeight: '600' },
  previewContent: { flexDirection: 'row', alignItems: 'center' },
  previewAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12,
  },
  previewAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  previewInitials: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  previewName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  previewMeta: { fontSize: 11 },
  previewBio: { fontSize: 12, marginTop: 2 },

  // Botão
  saveButton: {
    backgroundColor: Theme.primary, padding: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    ...Shadows.primary,
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
