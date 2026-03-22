import React, { useState, useCallback } from 'react';
import {
	View, Text, StyleSheet, TouchableOpacity, FlatList,
	Modal, TextInput, Alert, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useGoBack } from '../../hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { EmergencyContact } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';

const STORAGE_KEY = 'petEmergencyContacts';

const TYPE_CONFIG: Record<EmergencyContact['type'], { icon: keyof typeof Ionicons.glyphMap; color: string; labelKey: string }> = {
	vet:       { icon: 'medkit-outline',    color: '#4CAF50', labelKey: 'emergencyContacts.typeVet' },
	clinic:    { icon: 'business-outline',  color: '#2196F3', labelKey: 'emergencyContacts.typeClinic' },
	emergency: { icon: 'alert-circle-outline', color: '#F44336', labelKey: 'emergencyContacts.typeEmergency' },
};

const BLANK: Omit<EmergencyContact, 'id' | 'petId'> = {
	type: 'vet', name: '', phone: '', address: '', notes: '',
};

export default function EmergencyContactsScreen() {
	const { petId, petName } = useLocalSearchParams<{ petId: string; petName: string }>();
	const goBack = useGoBack();
	const { colors } = useTheme();
	const { t } = useTranslation();

	const [contacts, setContacts] = useState<EmergencyContact[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [editing, setEditing] = useState<EmergencyContact | null>(null);
	const [form, setForm] = useState({ ...BLANK });

	useFocusEffect(useCallback(() => {
		load();
	}, [petId]));

	const load = async () => {
		try {
			const json = await AsyncStorage.getItem(STORAGE_KEY);
			const all: EmergencyContact[] = json ? JSON.parse(json) : [];
			setContacts(all.filter(c => c.petId === petId));
		} catch { }
	};

	const save = async (updated: EmergencyContact[]) => {
		const json = await AsyncStorage.getItem(STORAGE_KEY);
		const all: EmergencyContact[] = json ? JSON.parse(json) : [];
		const others = all.filter(c => c.petId !== petId);
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...updated]));
		setContacts(updated);
	};

	const openAdd = () => {
		setEditing(null);
		setForm({ ...BLANK });
		setModalVisible(true);
	};

	const openEdit = (c: EmergencyContact) => {
		setEditing(c);
		setForm({ type: c.type, name: c.name, phone: c.phone, address: c.address ?? '', notes: c.notes ?? '' });
		setModalVisible(true);
	};

	const handleSave = async () => {
		if (!form.name.trim() || !form.phone.trim()) {
			Alert.alert(t('common.attention'), t('emergencyContacts.required'));
			return;
		}
		try {
			let updated: EmergencyContact[];
			if (editing) {
				updated = contacts.map(c => c.id === editing.id ? { ...editing, ...form } : c);
			} else {
				const newContact: EmergencyContact = {
					id: Date.now().toString(),
					petId: petId!,
					...form,
				};
				updated = [...contacts, newContact];
			}
			await save(updated);
			setModalVisible(false);
		} catch {
			Alert.alert(t('common.error'), t('emergencyContacts.saveError'));
		}
	};

	const handleDelete = (c: EmergencyContact) => {
		Alert.alert(t('emergencyContacts.deleteTitle'), t('emergencyContacts.deleteConfirm', { name: c.name }), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'), style: 'destructive', onPress: async () => {
					const updated = contacts.filter(x => x.id !== c.id);
					await save(updated);
				},
			},
		]);
	};

	const dial = (phone: string) => {
		Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
	};

	const renderContact = ({ item }: { item: EmergencyContact }) => {
		const cfg = TYPE_CONFIG[item.type];
		return (
			<View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: cfg.color }, Shadows.small]}>
				<View style={[styles.cardIcon, { backgroundColor: cfg.color + '20' }]}>
					<Ionicons name={cfg.icon} size={22} color={cfg.color} />
				</View>
				<View style={styles.cardInfo}>
					<Text style={[styles.cardType, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
					<Text style={[styles.cardName, { color: colors.text.primary }]}>{item.name}</Text>
					<Text style={[styles.cardPhone, { color: colors.text.secondary }]}>{item.phone}</Text>
					{!!item.address && (
						<Text style={[styles.cardAddress, { color: colors.text.light }]} numberOfLines={1}>{item.address}</Text>
					)}
				</View>
				<View style={styles.cardActions}>
					<TouchableOpacity
						style={[styles.dialBtn, { backgroundColor: '#4CAF50' }]}
						onPress={() => dial(item.phone)}
					>
						<Ionicons name="call" size={18} color="#fff" />
					</TouchableOpacity>
					<TouchableOpacity onPress={() => openEdit(item)} style={styles.editIconBtn}>
						<Ionicons name="create-outline" size={20} color={colors.text.secondary} />
					</TouchableOpacity>
					<TouchableOpacity onPress={() => handleDelete(item)} style={styles.editIconBtn}>
						<Ionicons name="trash-outline" size={20} color="#F44336" />
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header */}
			<View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				<TouchableOpacity style={styles.headerBtn} onPress={goBack}>
					<Ionicons name="arrow-back" size={24} color={colors.text.primary} />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('emergencyContacts.title')}</Text>
					{!!petName && <Text style={[styles.headerSub, { color: colors.text.secondary }]}>{petName}</Text>}
				</View>
				<TouchableOpacity
					style={[styles.headerBtn, styles.addHeaderBtn, { backgroundColor: '#F44336' }]}
					onPress={openAdd}
				>
					<Ionicons name="add" size={22} color="#fff" />
				</TouchableOpacity>
			</View>

			<FlatList
				data={contacts}
				keyExtractor={c => c.id}
				renderItem={renderContact}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<View style={styles.empty}>
						<Ionicons name="call-outline" size={48} color={colors.text.light} />
						<Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('emergencyContacts.empty')}</Text>
						<Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>{t('emergencyContacts.emptyMsg', { name: petName })}</Text>
						<TouchableOpacity
							style={[styles.emptyBtn, { backgroundColor: '#F44336' }]}
							onPress={openAdd}
						>
							<Text style={styles.emptyBtnText}>{t('emergencyContacts.add')}</Text>
						</TouchableOpacity>
					</View>
				}
			/>

			{/* Modal */}
			<Modal visible={modalVisible} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
						<Text style={[styles.modalTitle, { color: colors.text.primary }]}>
							{editing ? t('emergencyContacts.edit') : t('emergencyContacts.add')}
						</Text>

						{/* Tipo */}
						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('emergencyContacts.type')}</Text>
						<View style={styles.typeRow}>
							{(Object.keys(TYPE_CONFIG) as EmergencyContact['type'][]).map(type => {
								const cfg = TYPE_CONFIG[type];
								const active = form.type === type;
								return (
									<TouchableOpacity
										key={type}
										style={[styles.typeChip, { borderColor: active ? cfg.color : colors.border, backgroundColor: active ? cfg.color + '20' : colors.card }]}
										onPress={() => setForm(f => ({ ...f, type }))}
									>
										<Ionicons name={cfg.icon} size={16} color={active ? cfg.color : colors.text.secondary} />
										<Text style={[styles.typeChipText, { color: active ? cfg.color : colors.text.secondary }]}>
											{t(cfg.labelKey)}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						{/* Nome */}
						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('emergencyContacts.name')}</Text>
						<TextInput
							style={[styles.input, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={form.name}
							onChangeText={v => setForm(f => ({ ...f, name: v }))}
							placeholder={t('emergencyContacts.namePlaceholder')}
							placeholderTextColor={colors.text.light}
						/>

						{/* Telefone */}
						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('emergencyContacts.phone')}</Text>
						<TextInput
							style={[styles.input, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={form.phone}
							onChangeText={v => setForm(f => ({ ...f, phone: v }))}
							placeholder={t('emergencyContacts.phonePlaceholder')}
							placeholderTextColor={colors.text.light}
							keyboardType="phone-pad"
						/>

						{/* Endereço */}
						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('emergencyContacts.address')}</Text>
						<TextInput
							style={[styles.input, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={form.address}
							onChangeText={v => setForm(f => ({ ...f, address: v }))}
							placeholder={t('emergencyContacts.addressPlaceholder')}
							placeholderTextColor={colors.text.light}
						/>

						{/* Notas */}
						<Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{t('emergencyContacts.notes')}</Text>
						<TextInput
							style={[styles.input, styles.inputMulti, { backgroundColor: colors.card, color: colors.text.primary, borderColor: colors.border }]}
							value={form.notes}
							onChangeText={v => setForm(f => ({ ...f, notes: v }))}
							placeholder={t('emergencyContacts.notesPlaceholder')}
							placeholderTextColor={colors.text.light}
							multiline
							numberOfLines={3}
						/>

						<View style={styles.modalBtns}>
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
								onPress={() => setModalVisible(false)}
							>
								<Text style={[styles.modalBtnText, { color: colors.text.secondary }]}>{t('common.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: '#F44336' }]}
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
	addHeaderBtn: { borderRadius: 20 },
	headerCenter: { flex: 1, paddingHorizontal: 8 },
	headerTitle: { fontSize: 18, fontWeight: '700' },
	headerSub: { fontSize: 13, marginTop: 1 },
	listContent: { padding: 16, paddingBottom: 40 },
	card: {
		flexDirection: 'row', alignItems: 'center',
		borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 4,
	},
	cardIcon: {
		width: 44, height: 44, borderRadius: 12,
		justifyContent: 'center', alignItems: 'center', marginRight: 12,
	},
	cardInfo: { flex: 1 },
	cardType: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
	cardName: { fontSize: 15, fontWeight: '700' },
	cardPhone: { fontSize: 13, marginTop: 2 },
	cardAddress: { fontSize: 12, marginTop: 2 },
	cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	dialBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
	editIconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
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
	typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
	typeChip: {
		flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
		gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
	},
	typeChipText: { fontSize: 12, fontWeight: '600' },
	input: {
		borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
		paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, marginBottom: 14,
	},
	inputMulti: { height: 80, textAlignVertical: 'top' },
	modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
	modalBtn: {
		flex: 1, paddingVertical: 14, borderRadius: 12,
		alignItems: 'center', borderWidth: 1,
	},
	modalBtnText: { fontSize: 15, fontWeight: '700' },
});
