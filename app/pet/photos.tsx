import React, { useState, useCallback } from 'react';
import {
	View, Text, StyleSheet, TouchableOpacity, FlatList,
	Modal, TextInput, Alert, Image, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useGoBack } from '../../hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { PetPhoto } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';
import { syncPetPhotos } from '../../services/syncService';

const STORAGE_KEY = 'petPhotos';
const NUM_COLS = 3;
const SCREEN_W = Dimensions.get('window').width;
const THUMB_SIZE = (SCREEN_W - 32 - (NUM_COLS - 1) * 4) / NUM_COLS;

function formatDate(iso: string) {
	const d = new Date(iso);
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export default function PetPhotosScreen() {
	const { petId, petName } = useLocalSearchParams<{ petId: string; petName: string }>();
	const goBack = useGoBack();
	const { colors } = useTheme();
	const { t } = useTranslation();

	const [photos, setPhotos] = useState<PetPhoto[]>([]);
	const [viewPhoto, setViewPhoto] = useState<PetPhoto | null>(null);
	const [addCaption, setAddCaption] = useState('');
	const [addUri, setAddUri] = useState<string | null>(null);
	const [addModalVisible, setAddModalVisible] = useState(false);

	useFocusEffect(useCallback(() => { load(); }, [petId]));

	const load = async () => {
		try {
			const json = await AsyncStorage.getItem(STORAGE_KEY);
			const all: PetPhoto[] = json ? JSON.parse(json) : [];
			setPhotos(all.filter(p => p.petId === petId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
		} catch { }
	};

	const saveAll = async (updated: PetPhoto[]) => {
		const json = await AsyncStorage.getItem(STORAGE_KEY);
		const all: PetPhoto[] = json ? JSON.parse(json) : [];
		const others = all.filter(p => p.petId !== petId);
		await syncPetPhotos([...others, ...updated]);
		setPhotos(updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
	};

	const pickImage = async (useCamera: boolean) => {
		try {
			const perm = useCamera
				? await ImagePicker.requestCameraPermissionsAsync()
				: await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!perm.granted) return;

			const result = useCamera
				? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
				: await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });

			if (!result.canceled && result.assets[0]) {
				setAddUri(result.assets[0].uri);
				setAddCaption('');
				setAddModalVisible(true);
			}
		} catch { }
	};

	const openPicker = () => {
		Alert.alert(t('photos.add'), t('photos.photoOptions'), [
			{ text: t('photos.camera'), onPress: () => setTimeout(() => pickImage(true), 300) },
			{ text: t('photos.gallery'), onPress: () => setTimeout(() => pickImage(false), 300) },
			{ text: t('common.cancel'), style: 'cancel' },
		]);
	};

	const handleSave = async () => {
		if (!addUri) return;
		const now = new Date().toISOString();
		const newPhoto: PetPhoto = {
			id: Date.now().toString(),
			petId: petId!,
			uri: addUri,
			date: formatDate(now),
			caption: addCaption.trim() || undefined,
			createdAt: now,
		};
		const updated = [newPhoto, ...photos];
		await saveAll(updated);
		setAddModalVisible(false);
	};

	const handleDelete = (photo: PetPhoto) => {
		Alert.alert(t('photos.deleteTitle'), t('photos.deleteConfirm'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'), style: 'destructive', onPress: async () => {
					setViewPhoto(null);
					const updated = photos.filter(p => p.id !== photo.id);
					await saveAll(updated);
				},
			},
		]);
	};

	const renderThumb = ({ item }: { item: PetPhoto }) => (
		<TouchableOpacity onPress={() => setViewPhoto(item)} activeOpacity={0.85}>
			<Image
				source={{ uri: item.uri }}
				style={[styles.thumb, { width: THUMB_SIZE, height: THUMB_SIZE }]}
			/>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header */}
			<View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				<TouchableOpacity style={styles.headerBtn} onPress={goBack}>
					<Ionicons name="arrow-back" size={24} color={colors.text.primary} />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
						{t('photos.title', { name: petName ?? '' })}
					</Text>
				</View>
				<TouchableOpacity
					style={[styles.headerBtn, styles.addBtn, { backgroundColor: Theme.primary }]}
					onPress={openPicker}
				>
					<Ionicons name="add" size={22} color="#fff" />
				</TouchableOpacity>
			</View>

			{photos.length === 0 ? (
				<View style={styles.empty}>
					<Ionicons name="images-outline" size={56} color={colors.text.light} />
					<Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('photos.empty')}</Text>
					<Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>{t('photos.emptyMsg')}</Text>
					<TouchableOpacity
						style={[styles.emptyAddBtn, { backgroundColor: Theme.primary }]}
						onPress={openPicker}
					>
						<Ionicons name="camera-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
						<Text style={styles.emptyAddText}>{t('photos.add')}</Text>
					</TouchableOpacity>
				</View>
			) : (
				<FlatList
					data={photos}
					keyExtractor={p => p.id}
					numColumns={NUM_COLS}
					renderItem={renderThumb}
					contentContainerStyle={styles.grid}
					columnWrapperStyle={styles.row}
					showsVerticalScrollIndicator={false}
				/>
			)}

			{/* Visualizador */}
			<Modal visible={!!viewPhoto} animationType="fade" transparent>
				<View style={styles.viewerOverlay}>
					<SafeAreaView style={styles.viewerSafe}>
						<View style={styles.viewerHeader}>
							<TouchableOpacity onPress={() => setViewPhoto(null)}>
								<Ionicons name="close" size={28} color="#fff" />
							</TouchableOpacity>
							<Text style={styles.viewerDate}>{viewPhoto?.date}</Text>
							<TouchableOpacity onPress={() => viewPhoto && handleDelete(viewPhoto)}>
								<Ionicons name="trash-outline" size={24} color="#ff6b6b" />
							</TouchableOpacity>
						</View>
						{!!viewPhoto && (
							<Image source={{ uri: viewPhoto.uri }} style={styles.viewerImage} resizeMode="contain" />
						)}
						{!!viewPhoto?.caption && (
							<Text style={styles.viewerCaption}>{viewPhoto.caption}</Text>
						)}
					</SafeAreaView>
				</View>
			</Modal>

			{/* Modal adicionar */}
			<Modal visible={addModalVisible} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
						<Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('photos.addTitle')}</Text>
						{!!addUri && (
							<Image source={{ uri: addUri }} style={styles.previewImg} resizeMode="cover" />
						)}
						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('photos.caption')}</Text>
						<TextInput
							style={[styles.captionInput, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={addCaption}
							onChangeText={setAddCaption}
							placeholder={t('photos.captionPlaceholder')}
							placeholderTextColor={colors.text.light}
						/>
						<View style={styles.modalBtns}>
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
								onPress={() => setAddModalVisible(false)}
							>
								<Text style={[styles.modalBtnText, { color: colors.text.secondary }]}>{t('common.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: Theme.primary }]}
								onPress={handleSave}
							>
								<Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: 'row', alignItems: 'center',
		paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1,
	},
	headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
	addBtn: { borderRadius: 20 },
	headerCenter: { flex: 1, paddingHorizontal: 8 },
	headerTitle: { fontSize: 18, fontWeight: '700' },
	headerSub: { fontSize: 13, marginTop: 1 },
	grid: { padding: 16, paddingBottom: 40 },
	row: { gap: 4, marginBottom: 4 },
	thumb: { borderRadius: 8, backgroundColor: '#eee' },
	empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
	emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
	emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
	emptyAddBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
	emptyAddText: { color: '#fff', fontWeight: '700', fontSize: 15 },
	// Viewer
	viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
	viewerSafe: { flex: 1 },
	viewerHeader: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		paddingHorizontal: 20, paddingVertical: 16,
	},
	viewerDate: { color: '#fff', fontSize: 14, opacity: 0.8 },
	viewerImage: { flex: 1, width: '100%' },
	viewerCaption: { color: '#fff', fontSize: 15, textAlign: 'center', padding: 16, opacity: 0.9 },
	// Add modal
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
	modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
	previewImg: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
	fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
	captionInput: {
		borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
		paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, marginBottom: 16,
	},
	modalBtns: { flexDirection: 'row', gap: 12 },
	modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
	modalBtnText: { fontSize: 15, fontWeight: '700' },
});
