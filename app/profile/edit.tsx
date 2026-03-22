import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, Platform, TextInput as TextInputComponent } from 'react-native';
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

const getInitials = (name: string): string =>
  name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export default function EditProfileScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)');
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [showSuccess, setShowSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const profileJSON = await AsyncStorage.getItem('userProfile');
      if (profileJSON) {
        const profile: UserProfile = JSON.parse(profileJSON);
        setName(profile.name || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatarUrl);
      }
    };
    loadProfile();
  }, []);

  const pickAvatar = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(t('editProfile.permissionRequired'), useCamera ? t('editProfile.permissionCamera') : t('editProfile.permissionGallery'));
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });

      if (!result.canceled && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch {
      Alert.alert(t('common.error'), t('editProfile.imageError'));
    }
  };

  const showAvatarOptions = () => {
    Alert.alert(t('editProfile.avatarOptions'), t('editProfile.avatarOptionsMsg'), [
      { text: t('editProfile.camera'), onPress: () => setTimeout(() => pickAvatar(true), 300) },
      { text: t('editProfile.gallery'), onPress: () => setTimeout(() => pickAvatar(false), 300) },
      ...(avatarUrl ? [{ text: t('editProfile.removePhoto'), style: 'destructive' as const, onPress: () => setAvatarUrl(undefined) }] : []),
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(t('editProfile.nameRequired'));
      return;
    }
    if (name.trim().length < 2) {
      setNameError(t('editProfile.nameMinLength'));
      return;
    }
    setNameError('');

    const newProfile: UserProfile = { name: name.trim(), bio: bio.trim(), avatarUrl };

    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
      setShowSuccess(true);
      setTimeout(() => goBack(), 1800);
    } catch {
      Alert.alert(t('common.error'), t('editProfile.saveError'));
    }
  };

  const displayName = name.trim() || 'Seu Nome';
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
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={[styles.avatarEditBadge, { backgroundColor: Theme.primary }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.text.light }]}>{t('editProfile.avatarHint')}</Text>
        </View>

        {/* Campo Nome */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t('editProfile.nameLabel')} <Text style={{ color: Theme.danger }}>*</Text>
          </Text>
          <View style={[
            styles.inputRow,
            { backgroundColor: colors.surface, borderColor: nameError ? Theme.danger : colors.border },
          ]}>
            <Ionicons name="person-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
            <View
              style={styles.textInputWrapper}
            >
              <TextInputComponent
                value={name}
                onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
                placeholder={t('editProfile.namePlaceholder')}
                placeholderTextColor={colors.text.light}
                style={[styles.textInput, { color: colors.text.primary }]}
                autoCapitalize="words"
                maxLength={50}
              />
            </View>
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          <Text style={[styles.charCount, { color: colors.text.light }]}>{name.length}/50</Text>
        </View>

        {/* Campo Bio */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('editProfile.bioLabel')}</Text>
          <View style={[styles.inputRow, styles.inputMultiline, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 14 }]} />
            <TextInputComponent
              value={bio}
              onChangeText={setBio}
              placeholder={t('editProfile.bioPlaceholder')}
              placeholderTextColor={colors.text.light}
              style={[styles.textInput, styles.textInputMultiline, { color: colors.text.primary }]}
              multiline
              numberOfLines={4}
              maxLength={150}
              autoCapitalize="sentences"
            />
          </View>
          <Text style={[styles.charCount, { color: colors.text.light }]}>{bio.length}/150</Text>
        </View>

        {/* Preview do perfil */}
        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="eye-outline" size={16} color={colors.text.secondary} />
          <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>{t('editProfile.previewLabel')}</Text>
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
              <Text style={[styles.previewBio, { color: colors.text.secondary }]} numberOfLines={2}>
                {bio.trim() || t('editProfile.defaultBio')}
              </Text>
            </View>
          </View>
        </View>

        {/* Botão Salvar */}
        <AnimatedButton style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>{t('editProfile.saveBtn')}</Text>
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
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    ...Shadows.medium,
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarInitials: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarHint: { fontSize: 13 },
  // Campos
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    ...Shadows.small,
  },
  inputMultiline: { alignItems: 'flex-start' },
  inputIcon: { marginRight: 10 },
  textInputWrapper: { flex: 1 },
  textInput: { flex: 1, fontSize: 16, paddingVertical: 14 },
  textInputMultiline: { paddingVertical: 12, minHeight: 90, textAlignVertical: 'top' },
  errorText: { color: Theme.danger, fontSize: 12, marginTop: 4, marginLeft: 2 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  // Preview
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  previewLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  previewContent: { flexDirection: 'row', alignItems: 'center' },
  previewAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    marginRight: 12,
  },
  previewAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  previewInitials: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  previewName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  previewBio: { fontSize: 13 },
  // Botão
  saveButton: {
    backgroundColor: Theme.primary,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
