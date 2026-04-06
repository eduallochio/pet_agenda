import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncVaccinations } from '../../services/syncService';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useGoBack } from '../../hooks/useGoBack';
import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VaccineRecord, Pet } from '../../types/pet';
import { Theme } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import DatePickerInput from '../../components/DatePickerInput';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ValidatedInput from '../../components/ValidatedInput';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useTheme } from '../../hooks/useTheme';
import { checkAndUnlockAchievements } from '../../hooks/useAchievements';
import { autoCompleteChallenge } from '../../hooks/useChallenges';
import { useTranslation } from 'react-i18next';

// Vacinas comuns para sugestão rápida
const COMMON_VACCINES = [
	'V8 Canina', 'V10 Canina', 'Antirrábica', 'Gripe Canina',
	'Quíntupla Felina', 'Tríplice Felina', 'FeLV', 'Giárdia',
];

export default function NewVaccineScreen() {
	const router = useRouter();
	const goBack = useGoBack('/(tabs)');
	const { colors } = useTheme();
	const { t } = useTranslation();
	const params = useLocalSearchParams();
	const petId = params.petId as string;
	const vaccineId = params.vaccineId as string | undefined;
	const prefillName = params.prefillName as string | undefined;
	const isEditing = !!vaccineId;

	const [vaccineName, setVaccineName] = useState(prefillName ?? '');
	// Pré-preenche data de hoje quando vier de lembrete concluído
	const [dateAdministered, setDateAdministered] = useState<Date | null>(prefillName ? new Date() : null);
	const [nextDueDate, setNextDueDate] = useState<Date | null>(null);
	const [showSuccess, setShowSuccess] = useState(false);

	const { validateAll, getFieldError, touchField } = useFormValidation({
		vaccineName: { required: true, minLength: 2, maxLength: 100 },
	});

	useEffect(() => {
		if (!isEditing) return;
		const loadVaccineData = async () => {
			try {
				const recordsJSON = await AsyncStorage.getItem('vaccinations');
				const allRecords: VaccineRecord[] = recordsJSON ? JSON.parse(recordsJSON) : [];
				const record = allRecords.find(v => v.id === vaccineId);
				if (record) {
					setVaccineName(record.vaccineName);
					const parseDateStr = (s: string) => {
						const parts = s.split('/');
						if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
						return null;
					};
					const d = parseDateStr(record.dateAdministered);
					if (d) setDateAdministered(d);
					if (record.nextDueDate) {
						const n = parseDateStr(record.nextDueDate);
						if (n) setNextDueDate(n);
					}
				}
			} catch (error) {
				console.error("Erro ao carregar vacina:", error);
			}
		};
		loadVaccineData();
	}, [vaccineId, isEditing]);

	const formatDate = (date: Date) =>
		`${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

	const handleDelete = async () => {
		Alert.alert(t('vaccine.deleteTitle'), t('vaccine.deleteConfirm'), [
			{ text: t('common.cancel'), style: "cancel" },
			{
				text: t('common.delete'),
				style: "destructive",
				onPress: async () => {
					try {
						const json = await AsyncStorage.getItem('vaccinations');
						let records: VaccineRecord[] = json ? JSON.parse(json) : [];
						const toDelete = records.find(v => v.id === vaccineId);
						if (toDelete?.notificationIds && Platform.OS !== 'web') {
							const NS = await import('../../services/notificationService');
							await NS.cancelNotifications(toDelete.notificationIds);
						}
						records = records.filter(v => v.id !== vaccineId);
						await syncVaccinations(records);
						goBack();
					} catch {
						Alert.alert(t('common.error'), t('vaccine.deleteError'));
					}
				}
			}
		]);
	};

	const handleSave = async () => {
		const isValid = validateAll({ vaccineName });
		if (!isValid) return;
		if (!dateAdministered) {
			Alert.alert(t('common.attention'), t('vaccine.dateRequired'));
			return;
		}

		const formattedAdmin = formatDate(dateAdministered);
		const formattedNext = nextDueDate ? formatDate(nextDueDate) : undefined;

		// Verifica duplicata
		try {
			const existingJSON = await AsyncStorage.getItem('vaccinations');
			const existing: VaccineRecord[] = existingJSON ? JSON.parse(existingJSON) : [];
			const duplicate = existing.find(v =>
				v.petId === petId &&
				v.vaccineName.trim().toLowerCase() === vaccineName.trim().toLowerCase() &&
				v.dateAdministered === formattedAdmin &&
				v.id !== vaccineId
			);
			if (duplicate) {
				Alert.alert(
					t('vaccine.duplicateTitle'),
					t('vaccine.duplicateMessage')
				);
				return;
			}
		} catch { /* ignora e prossegue */ }

		try {
			const json = await AsyncStorage.getItem('vaccinations');
			let records: VaccineRecord[] = json ? JSON.parse(json) : [];

			const petsJSON = await AsyncStorage.getItem('pets');
			const pets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
			const pet = pets.find(p => p.id === petId);
			const petName = pet?.name || 'Seu pet';

			let notificationIds: string[] = [];
			if (Platform.OS !== 'web' && nextDueDate && nextDueDate > new Date()) {
				try {
					const NS = await import('../../services/notificationService');
					notificationIds = await NS.scheduleVaccineNotification(
						vaccineId || Date.now().toString(), petName, vaccineName, nextDueDate
					);
				} catch { /* notif opcional */ }
			}

			if (isEditing) {
				const old = records.find(v => v.id === vaccineId);
				if (old?.notificationIds && Platform.OS !== 'web') {
					try {
						const NS = await import('../../services/notificationService');
						await NS.cancelNotifications(old.notificationIds);
					} catch { /* ignore */ }
				}
				records = records.map(v =>
					v.id === vaccineId
						? { ...v, vaccineName, dateAdministered: formattedAdmin, nextDueDate: formattedNext, notificationIds }
						: v
				);
			} else {
				records.push({
					id: Date.now().toString(),
					petId,
					vaccineName,
					dateAdministered: formattedAdmin,
					nextDueDate: formattedNext,
					notificationIds,
				});
			}

			await syncVaccinations(records);

			// Verificar conquistas
			const [petsJ, remJ, weightJ, streakJ] = await Promise.all([
				AsyncStorage.getItem('pets'),
				AsyncStorage.getItem('reminders'),
				AsyncStorage.getItem('weightRecords'),
				AsyncStorage.getItem('streakData'),
			]);
			await checkAndUnlockAchievements({
				pets: petsJ ? JSON.parse(petsJ) : [],
				reminders: remJ ? JSON.parse(remJ) : [],
				vaccines: records,
				weightRecords: weightJ ? JSON.parse(weightJ) : [],
				streak: streakJ ? JSON.parse(streakJ) : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 },
			});
			await autoCompleteChallenge('register_vaccine');

			setShowSuccess(true);
			setTimeout(() => { try { goBack(); } catch (e) { console.error('nav error:', e); } }, 1800);
		} catch (err) {
			console.error('Erro ao salvar vacina:', err);
			Alert.alert(t('common.error'), t('vaccine.saveError'));
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header */}
			<View style={[styles.header, { backgroundColor: colors.background }]}>
				<TouchableOpacity style={styles.headerBtn} onPress={() => goBack()}>
					<Ionicons name="arrow-back" size={24} color={colors.text.primary} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text.primary }]}>
					{isEditing ? t('vaccine.editTitle') : t('vaccine.newTitle')}
				</Text>
				{isEditing ? (
					<TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
						<Ionicons name="trash-outline" size={22} color={Theme.danger} />
					</TouchableOpacity>
				) : (
					<View style={styles.headerBtn} />
				)}
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

				{/* Nome da vacina */}
				<ValidatedInput
					iconName="medical"
					placeholder={t('vaccine.namePlaceholder')}
					value={vaccineName}
					onChangeText={setVaccineName}
					onBlur={() => touchField('vaccineName')}
					error={getFieldError('vaccineName')}
					required
				/>

				{/* Sugestões rápidas */}
				{!isEditing && (
					<View style={styles.suggestionsSection}>
						<Text style={[styles.label, { color: colors.text.secondary }]}>{t('reminder.suggestions')}</Text>
						<View style={styles.suggestionsGrid}>
							{COMMON_VACCINES.map(name => (
								<TouchableOpacity
									key={name}
									style={[
										styles.suggestionChip,
										{ borderColor: colors.border, backgroundColor: colors.surface },
										vaccineName === name && { borderColor: Theme.primary, backgroundColor: Theme.primary + '15' },
									]}
									onPress={() => setVaccineName(name)}
								>
									<Text style={[
										styles.suggestionText,
										{ color: colors.text.secondary },
										vaccineName === name && { color: Theme.primary, fontWeight: '700' },
									]}>
										{name}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				)}

				{/* Data de aplicação */}
				<DatePickerInput
					label={t('vaccine.appliedDateLabel')}
					value={dateAdministered}
					onChange={setDateAdministered}
					placeholder={t('vaccine.appliedDatePlaceholder')}
					maximumDate={new Date()}
				/>

				{/* Próximo reforço */}
				<DatePickerInput
					label={t('vaccine.boosterLabel')}
					value={nextDueDate}
					onChange={setNextDueDate}
					placeholder={t('vaccine.boosterPlaceholder')}
					minimumDate={dateAdministered || new Date()}
				/>

				{/* Info sobre notificações */}
				{!!nextDueDate && Platform.OS !== 'web' && (
					<View style={[styles.infoBox, { backgroundColor: Theme.primary + '10', borderColor: Theme.primary + '30' }]}>
						<Ionicons name="notifications-outline" size={16} color={Theme.primary} />
						<Text style={[styles.infoText, { color: Theme.primary }]}>
							{t('vaccine.boosterInfo')}
						</Text>
					</View>
				)}

				{/* Botão salvar */}
				<AnimatedButton style={styles.saveButton} onPress={handleSave}>
					<Text style={styles.saveButtonText}>{isEditing ? t('vaccine.editTitle') : t('vaccine.newTitle')}</Text>
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
		paddingHorizontal: 8,
		paddingVertical: 12,
	},
	headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
	headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 4 },
	scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
	label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
	// Sugestões
	suggestionsSection: { marginBottom: 4 },
	suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	suggestionChip: {
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 7,
	},
	suggestionText: { fontSize: 13 },
	// Info box
	infoBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		marginTop: 16,
		gap: 8,
	},
	infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
	// Botão
	saveButton: {
		backgroundColor: Theme.primary,
		paddingVertical: 16,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 28,
	},
	saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
