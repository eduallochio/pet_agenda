import React, { useState, useCallback } from 'react';
import {
	View, Text, StyleSheet, TouchableOpacity, FlatList,
	Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useGoBack } from '../../hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { FeedingRecord } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';

const STORAGE_KEY = 'petFeeding';

function todayStr() {
	const d = new Date();
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

const BLANK = { brand: '', dailyAmount: '', lastRefillDate: todayStr(), note: '' };

export default function FeedingScreen() {
	const { petId, petName } = useLocalSearchParams<{ petId: string; petName: string }>();
	const goBack = useGoBack();
	const { colors } = useTheme();
	const { t } = useTranslation();

	const [records, setRecords] = useState<FeedingRecord[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [editing, setEditing] = useState<FeedingRecord | null>(null);
	const [form, setForm] = useState({ ...BLANK });

	useFocusEffect(useCallback(() => { load(); }, [petId]));

	const load = async () => {
		try {
			const json = await AsyncStorage.getItem(STORAGE_KEY);
			const all: FeedingRecord[] = json ? JSON.parse(json) : [];
			setRecords(all.filter(r => r.petId === petId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
		} catch { }
	};

	const saveAll = async (updated: FeedingRecord[]) => {
		const json = await AsyncStorage.getItem(STORAGE_KEY);
		const all: FeedingRecord[] = json ? JSON.parse(json) : [];
		const others = all.filter(r => r.petId !== petId);
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...updated]));
		setRecords(updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
	};

	const openAdd = () => {
		setEditing(null);
		setForm({ ...BLANK, lastRefillDate: todayStr() });
		setModalVisible(true);
	};

	const openEdit = (r: FeedingRecord) => {
		setEditing(r);
		setForm({ brand: r.brand, dailyAmount: r.dailyAmount, lastRefillDate: r.lastRefillDate, note: r.note ?? '' });
		setModalVisible(true);
	};

	const handleSave = async () => {
		if (!form.brand.trim() || !form.dailyAmount.trim()) {
			Alert.alert(t('common.attention'), t('feeding.required'));
			return;
		}
		try {
			let updated: FeedingRecord[];
			if (editing) {
				updated = records.map(r => r.id === editing.id ? { ...editing, ...form } : r);
			} else {
				const rec: FeedingRecord = {
					id: Date.now().toString(),
					petId: petId!,
					brand: form.brand.trim(),
					dailyAmount: form.dailyAmount.trim(),
					lastRefillDate: form.lastRefillDate,
					note: form.note.trim() || undefined,
					createdAt: new Date().toISOString(),
				};
				updated = [rec, ...records];
			}
			await saveAll(updated);
			setModalVisible(false);
		} catch {
			Alert.alert(t('common.error'), t('feeding.saveError'));
		}
	};

	const handleDelete = (r: FeedingRecord) => {
		Alert.alert(t('feeding.deleteTitle'), t('feeding.deleteConfirm', { brand: r.brand }), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'), style: 'destructive', onPress: async () => {
					await saveAll(records.filter(x => x.id !== r.id));
				},
			},
		]);
	};

	const current = records[0];

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
						{t('feeding.title', { name: petName ?? '' })}
					</Text>
				</View>
				<TouchableOpacity
					style={[styles.headerBtn, styles.addBtn, { backgroundColor: '#8BC34A' }]}
					onPress={openAdd}
				>
					<Ionicons name="add" size={22} color="#fff" />
				</TouchableOpacity>
			</View>

			<FlatList
				data={records}
				keyExtractor={r => r.id}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.listContent}
				ListHeaderComponent={
					current ? (
						<View style={[styles.currentCard, { backgroundColor: '#8BC34A' + '18', borderColor: '#8BC34A' + '50' }]}>
							<View style={styles.currentCardHeader}>
								<MaterialCommunityIcons name="food-variant" size={22} color="#8BC34A" />
								<Text style={[styles.currentCardLabel, { color: '#8BC34A' }]}>{t('feeding.current')}</Text>
							</View>
							<Text style={[styles.currentBrand, { color: colors.text.primary }]}>{current.brand}</Text>
							<View style={styles.currentMeta}>
								<View style={styles.currentMetaItem}>
									<Ionicons name="scale-outline" size={14} color={colors.text.secondary} />
									<Text style={[styles.currentMetaText, { color: colors.text.secondary }]}>{current.dailyAmount} / {t('feeding.day')}</Text>
								</View>
								<View style={styles.currentMetaItem}>
									<Ionicons name="refresh-outline" size={14} color={colors.text.secondary} />
									<Text style={[styles.currentMetaText, { color: colors.text.secondary }]}>{t('feeding.lastRefill')}: {current.lastRefillDate}</Text>
								</View>
							</View>
							{!!current.note && (
								<Text style={[styles.currentNote, { color: colors.text.secondary }]}>{current.note}</Text>
							)}
						</View>
					) : null
				}
				ListEmptyComponent={
					<View style={styles.empty}>
						<MaterialCommunityIcons name="food-variant" size={52} color={colors.text.light} />
						<Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('feeding.empty')}</Text>
						<Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>{t('feeding.emptyMsg')}</Text>
						<TouchableOpacity style={[styles.emptyBtn, { backgroundColor: '#8BC34A' }]} onPress={openAdd}>
							<Text style={styles.emptyBtnText}>{t('feeding.add')}</Text>
						</TouchableOpacity>
					</View>
				}
				renderItem={({ item, index }) => (
					<TouchableOpacity
						style={[
							styles.historyCard,
							{ backgroundColor: colors.surface, borderLeftColor: index === 0 ? '#8BC34A' : colors.border },
							Shadows.small,
						]}
						onPress={() => openEdit(item)}
						activeOpacity={0.8}
					>
						<View style={styles.historyInfo}>
							{index === 0 && (
								<View style={[styles.currentBadge, { backgroundColor: '#8BC34A' }]}>
									<Text style={styles.currentBadgeText}>{t('feeding.current')}</Text>
								</View>
							)}
							<Text style={[styles.historyBrand, { color: colors.text.primary }]}>{item.brand}</Text>
							<Text style={[styles.historyMeta, { color: colors.text.secondary }]}>
								{item.dailyAmount} · {t('feeding.lastRefill')}: {item.lastRefillDate}
							</Text>
							{!!item.note && (
								<Text style={[styles.historyNote, { color: colors.text.light }]} numberOfLines={1}>{item.note}</Text>
							)}
						</View>
						<TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
							<Ionicons name="trash-outline" size={18} color="#F44336" />
						</TouchableOpacity>
					</TouchableOpacity>
				)}
			/>

			{/* Modal */}
			<Modal visible={modalVisible} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
						<Text style={[styles.modalTitle, { color: colors.text.primary }]}>
							{editing ? t('feeding.edit') : t('feeding.add')}
						</Text>

						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('feeding.brand')}</Text>
						<TextInput
							style={[styles.input, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={form.brand}
							onChangeText={v => setForm(f => ({ ...f, brand: v }))}
							placeholder={t('feeding.brandPlaceholder')}
							placeholderTextColor={colors.text.light}
						/>

						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('feeding.dailyAmount')}</Text>
						<TextInput
							style={[styles.input, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={form.dailyAmount}
							onChangeText={v => setForm(f => ({ ...f, dailyAmount: v }))}
							placeholder={t('feeding.dailyAmountPlaceholder')}
							placeholderTextColor={colors.text.light}
						/>

						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('feeding.lastRefill')}</Text>
						<TextInput
							style={[styles.input, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={form.lastRefillDate}
							onChangeText={v => setForm(f => ({ ...f, lastRefillDate: v }))}
							placeholder="DD/MM/YYYY"
							placeholderTextColor={colors.text.light}
							keyboardType="numeric"
						/>

						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('feeding.note')}</Text>
						<TextInput
							style={[styles.input, styles.inputMulti, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={form.note}
							onChangeText={v => setForm(f => ({ ...f, note: v }))}
							placeholder={t('feeding.notePlaceholder')}
							placeholderTextColor={colors.text.light}
							multiline
							numberOfLines={2}
						/>

						<View style={styles.modalBtns}>
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
								onPress={() => setModalVisible(false)}
							>
								<Text style={[styles.modalBtnText, { color: colors.text.secondary }]}>{t('common.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: '#8BC34A' }]}
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
	listContent: { padding: 16, paddingBottom: 40 },
	// Card atual
	currentCard: {
		borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 20,
	},
	currentCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
	currentCardLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
	currentBrand: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
	currentMeta: { gap: 4 },
	currentMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	currentMetaText: { fontSize: 13 },
	currentNote: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
	// Histórico
	historyCard: {
		flexDirection: 'row', alignItems: 'center',
		borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 3,
	},
	historyInfo: { flex: 1 },
	currentBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
	currentBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
	historyBrand: { fontSize: 15, fontWeight: '700' },
	historyMeta: { fontSize: 12, marginTop: 2 },
	historyNote: { fontSize: 12, marginTop: 2 },
	deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
	// Empty
	empty: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
	emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
	emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
	emptyBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
	emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
	// Modal
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
	modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
	fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
	input: {
		borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
		paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, marginBottom: 14,
	},
	inputMulti: { height: 70, textAlignVertical: 'top' },
	modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
	modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
	modalBtnText: { fontSize: 15, fontWeight: '700' },
});
