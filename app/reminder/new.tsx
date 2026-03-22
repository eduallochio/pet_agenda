import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useGoBack } from '../../hooks/useGoBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Reminder, Pet, RecurrenceType } from '../../types/pet';
import { Theme, getCategoryColor } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import DatePickerInput from '../../components/DatePickerInput';
import ValidatedInput from '../../components/ValidatedInput';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useTheme } from '../../hooks/useTheme';
import { checkAndUnlockAchievements } from '../../hooks/useAchievements';
import { autoCompleteChallenge } from '../../hooks/useChallenges';
import { useTranslation } from 'react-i18next';

type Category = 'Saúde' | 'Higiene' | 'Consulta' | 'Prevenção' | 'Outro';

const CATEGORIES: { value: Category; icon: keyof typeof Ionicons.glyphMap }[] = [
	{ value: 'Saúde',     icon: 'medical' },
	{ value: 'Higiene',   icon: 'water' },
	{ value: 'Consulta',  icon: 'calendar' },
	{ value: 'Prevenção', icon: 'shield-checkmark' },
	{ value: 'Outro',     icon: 'ellipse-outline' },
];

const SUGGESTIONS: Record<Category, string[]> = {
	'Saúde':     ['Vermifugação', 'Antipulgas', 'Curativo', 'Medicação'],
	'Higiene':   ['Banho', 'Tosa', 'Corte de unhas', 'Limpeza de ouvido'],
	'Consulta':  ['Consulta de rotina', 'Retorno', 'Exame de sangue', 'Ultrassom'],
	'Prevenção': ['Antipulgas', 'Carrapatos', 'Vermífugo', 'Heartworm', 'Fungicida'],
	'Outro':     ['Passeio', 'Adestramento', 'Hotel pet', 'Comprar ração'],
};

export default function ReminderFormScreen() {
	const router = useRouter();
	const goBack = useGoBack('/(tabs)');
	const { colors } = useTheme();
	const { t } = useTranslation();
	const params = useLocalSearchParams();
	const petId = params.petId as string;
	const reminderId = params.reminderId as string | undefined;
	const isEditing = !!reminderId;

	const [category, setCategory] = useState<Category>('Saúde');
	const [description, setDescription] = useState('');
	const [date, setDate] = useState<Date | null>(null);
	const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
	const [showSuccess, setShowSuccess] = useState(false);

	const { validateAll, getFieldError, touchField } = useFormValidation({
		description: { required: true, minLength: 3, maxLength: 200 },
	});

	useEffect(() => {
		if (!isEditing) {
			// Apply prefill params from navigation (e.g. from weight screen suggestion)
			const prefillDesc = params.prefillDescription as string | undefined;
			const prefillCat = params.prefillCategory as string | undefined;
			const prefillRec = params.prefillRecurrence as string | undefined;
			if (prefillDesc) setDescription(prefillDesc);
			if (prefillCat && CATEGORIES.some(c => c.value === prefillCat)) setCategory(prefillCat as Category);
			if (prefillRec) setRecurrence(prefillRec as RecurrenceType);
			return;
		}
		const load = async () => {
			try {
				const json = await AsyncStorage.getItem('reminders');
				const all: Reminder[] = json ? JSON.parse(json) : [];
				const r = all.find(r => r.id === reminderId);
				if (r) {
					setCategory(r.category);
					setDescription(r.description);
					const parts = r.date.split('/');
					if (parts.length === 3) {
						setDate(new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
					}
				}
			} catch (e) {
				console.error('Erro ao carregar lembrete', e);
			}
		};
		load();
	}, [reminderId, isEditing]);

	const handleDelete = async () => {
		Alert.alert(t('petDetail.deleteReminder'), t('petDetail.deleteReminderMsg'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'),
				style: 'destructive',
				onPress: async () => {
					try {
						const json = await AsyncStorage.getItem('reminders');
						let all: Reminder[] = json ? JSON.parse(json) : [];
						const toDelete = all.find(r => r.id === reminderId);
						if (toDelete?.notificationIds && Platform.OS !== 'web') {
							try {
								const NS = await import('../../services/notificationService');
								await NS.cancelNotifications(toDelete.notificationIds);
							} catch { /* ignore */ }
						}
						all = all.filter(r => r.id !== reminderId);
						await AsyncStorage.setItem('reminders', JSON.stringify(all));
						goBack();
					} catch {
						Alert.alert(t('common.error'), t('reminder.deleteError'));
					}
				},
			},
		]);
	};

	const handleSave = async () => {
		const isValid = validateAll({ description });
		if (!isValid) {
			Alert.alert(t('common.attention'), t('addPet.validationError'));
			return;
		}
		if (!date) {
			Alert.alert(t('common.attention'), t('reminder.datePlaceholder') + '.');
			return;
		}

		const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

		// Verifica duplicata
		try {
			const json = await AsyncStorage.getItem('reminders');
			const all: Reminder[] = json ? JSON.parse(json) : [];
			const duplicate = all.find(r =>
				r.petId === petId &&
				r.category === category &&
				r.description.trim().toLowerCase() === description.trim().toLowerCase() &&
				r.date === formattedDate &&
				r.id !== reminderId
			);
			if (duplicate) {
				Alert.alert(t('reminder.duplicateTitle'), t('reminder.duplicateMessage'));
				return;
			}
		} catch { /* prossegue */ }

		try {
			const json = await AsyncStorage.getItem('reminders');
			let all: Reminder[] = json ? JSON.parse(json) : [];

			const petsJSON = await AsyncStorage.getItem('pets');
			const pets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
			const pet = pets.find(p => p.id === petId);
			const petName = pet?.name || 'Seu pet';

			let notificationIds: string[] = [];
			if (Platform.OS !== 'web' && date > new Date()) {
				try {
					const NS = await import('../../services/notificationService');
					notificationIds = await NS.scheduleReminderNotification(
						reminderId || Date.now().toString(),
						petName, description, date, category
					);
				} catch { /* notif opcional */ }
			}

			if (isEditing) {
				const old = all.find(r => r.id === reminderId);
				if (old?.notificationIds && Platform.OS !== 'web') {
					try {
						const NS = await import('../../services/notificationService');
						await NS.cancelNotifications(old.notificationIds);
					} catch { /* ignore */ }
				}
				all = all.map(r =>
					r.id === reminderId
						? { ...r, category, description, date: formattedDate, notificationIds }
						: r
				);
			} else {
				const newId = Date.now().toString();
				all.push({ id: newId, petId, category, description, date: formattedDate, notificationIds, recurrence });

				// Criar ocorrências futuras para lembretes recorrentes (próximos 6 meses)
				if (recurrence !== 'none') {
					const daysMap: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90 };
					const interval = daysMap[recurrence];
					const baseDate = new Date(date);
					const maxDate = new Date();
					maxDate.setMonth(maxDate.getMonth() + 6);
					let nextDate = new Date(baseDate);
					for (let i = 0; i < 24; i++) {
						nextDate = new Date(nextDate);
						nextDate.setDate(nextDate.getDate() + interval);
						if (nextDate > maxDate) break;
						const nd = `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`;
						let recurNotifIds: string[] = [];
						if (Platform.OS !== 'web' && nextDate > new Date()) {
							try {
								const NS = await import('../../services/notificationService');
								recurNotifIds = await NS.scheduleReminderNotification(
									Date.now().toString() + i, petName, description, nextDate, category
								);
							} catch { /* ignore */ }
						}
						all.push({ id: Date.now().toString() + '_r' + i, petId, category, description, date: nd, notificationIds: recurNotifIds, recurrence: 'none' });
					}
				}
			}

			await AsyncStorage.setItem('reminders', JSON.stringify(all));

			// Verificar conquistas
			const petsJ = await AsyncStorage.getItem('pets');
			const vacJ = await AsyncStorage.getItem('vaccinations');
			await checkAndUnlockAchievements({
				pets: petsJ ? JSON.parse(petsJ) : [],
				reminders: all,
				vaccines: vacJ ? JSON.parse(vacJ) : [],
			});
			await autoCompleteChallenge('register_reminder');

			setShowSuccess(true);
			setTimeout(() => goBack(), 1800);
		} catch {
			Alert.alert(t('common.error'), t('reminder.saveError'));
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header */}
			<View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				<TouchableOpacity style={styles.headerBtn} onPress={goBack}>
					<Ionicons name="arrow-back" size={24} color={colors.text.primary} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text.primary }]}>
					{isEditing ? t('reminder.editTitle') : t('reminder.newTitle')}
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

				{/* Categoria */}
				<Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{t('reminder.category')}</Text>
				<View style={styles.categoryGrid}>
					{CATEGORIES.map(({ value, icon }) => {
						const catColor = getCategoryColor(value as any);
						const isSelected = category === value;
						return (
							<TouchableOpacity
								key={value}
								style={[
									styles.categoryChip,
									{
										borderColor: isSelected ? catColor.main : colors.border,
										backgroundColor: isSelected ? catColor.main + '20' : colors.surface,
										...(Platform.OS === 'web'
											? { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
											: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 }),
									},
								]}
								onPress={() => setCategory(value)}
								activeOpacity={0.7}
							>
								<View style={[styles.categoryIconCircle, { backgroundColor: isSelected ? catColor.main : catColor.main + '20' }]}>
									<Ionicons name={icon} size={18} color={isSelected ? '#fff' : catColor.main} />
								</View>
								<Text style={[
									styles.categoryLabel,
									{ color: isSelected ? catColor.main : colors.text.secondary },
									isSelected && { fontWeight: '700' },
								]}>
									{value}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				{/* Info box Prevenção */}
				{category === 'Prevenção' && (
					<View style={[styles.infoBox, { backgroundColor: '#00BCD415', borderColor: '#00BCD450' }]}>
						<Ionicons name="shield-checkmark" size={16} color="#00BCD4" />
						<Text style={[styles.infoText, { color: '#00838F' }]}>
							{t('reminder.infoPreventive')}
						</Text>
					</View>
				)}

				{/* Descrição */}
				<Text style={[styles.sectionLabel, { color: colors.text.primary }]}>
					{t('reminder.descLabel')} <Text style={{ color: Theme.danger }}>*</Text>
				</Text>
				<ValidatedInput
					iconName="text"
					placeholder={t('reminder.descPlaceholder')}
					value={description}
					onChangeText={setDescription}
					onBlur={() => touchField('description')}
					error={getFieldError('description')}
					required
				/>

				{/* Sugestões rápidas */}
				<View style={styles.suggestionsSection}>
					<Text style={[styles.suggestionsLabel, { color: colors.text.secondary }]}>{t('reminder.suggestions')}</Text>
					<View style={styles.suggestionsRow}>
						{SUGGESTIONS[category].map(s => (
							<TouchableOpacity
								key={s}
								style={[
									styles.suggestionChip,
									{ borderColor: colors.border, backgroundColor: colors.surface },
									description === s && { borderColor: Theme.primary, backgroundColor: Theme.primary + '15' },
								]}
								onPress={() => setDescription(s)}
							>
								<Text style={[
									styles.suggestionText,
									{ color: colors.text.secondary },
									description === s && { color: Theme.primary, fontWeight: '700' },
								]}>
									{s}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Data */}
				<DatePickerInput
					label={t('reminder.dateLabel')}
					value={date}
					onChange={setDate}
					placeholder={t('reminder.datePlaceholder')}
				/>


				{/* Recorrência */}
				{!isEditing && (
					<>
						<Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{t('reminder.repeatLabel')}</Text>
						<View style={styles.recurrenceRow}>
							{([
								{ value: 'none',      label: t('reminder.noRepeat'), icon: 'close-circle-outline' },
								{ value: 'weekly',    label: t('reminder.recurrences.weekly'),     icon: 'repeat' },
								{ value: 'monthly',   label: t('reminder.recurrences.monthly'),      icon: 'calendar-outline' },
								{ value: 'quarterly', label: t('reminder.quarterly'),  icon: 'calendar-number-outline' },
							]).map(opt => (
								<TouchableOpacity
									key={opt.value}
									style={[
										styles.recurrenceChip,
										{ borderColor: colors.border, backgroundColor: colors.surface },
										recurrence === opt.value && { borderColor: Theme.primary, backgroundColor: Theme.primary + '15' },
									]}
									onPress={() => setRecurrence(opt.value as any)}
								>
									<Ionicons name={opt.icon as any} size={13} color={recurrence === opt.value ? Theme.primary : colors.text.secondary} />
									<Text style={[styles.recurrenceText, { color: colors.text.secondary }, recurrence === opt.value && { color: Theme.primary, fontWeight: '700' }]}>
										{opt.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
						{recurrence !== 'none' && (
							<View style={[styles.infoBox, { backgroundColor: Theme.primary + '12', borderColor: Theme.primary + '40' }]}>
								<Ionicons name="repeat" size={14} color={Theme.primary} />
								<Text style={[styles.infoText, { color: Theme.primary }]}>
									{recurrence === 'weekly' && t('reminder.infoWeekly')}
									{recurrence === 'monthly' && t('reminder.infoMonthly')}
									{recurrence === 'quarterly' && t('reminder.infoQuarterly')}
								</Text>
							</View>
						)}
					</>
				)}

				{/* Info notificação */}
				{!!date && Platform.OS !== 'web' && date > new Date() && (
					<View style={[styles.infoBox, { backgroundColor: Theme.info + '15', borderColor: Theme.info + '40' }]}>
						<Ionicons name="notifications-outline" size={16} color={Theme.info} />
						<Text style={[styles.infoText, { color: Theme.info }]}>
							{t('reminder.infoNotification')}
						</Text>
					</View>
				)}

				{/* Botão salvar */}
				<AnimatedButton style={styles.saveButton} onPress={handleSave}>
					<Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
					<Text style={styles.saveButtonText}>{isEditing ? t('reminder.updateBtn') : t('reminder.saveBtn')}</Text>
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
	scrollContent: { padding: 20, paddingBottom: 40 },
	sectionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
	// Categoria
	categoryGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -5,
		marginBottom: 24,
	},
	categoryChip: {
		width: '44%',
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1.5,
		margin: 5,
		...Shadows.small,
	},
	categoryIconCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	categoryLabel: { fontSize: 14 },
	// Sugestões
	suggestionsSection: { marginBottom: 20 },
	suggestionsLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
	suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
	suggestionChip: {
		borderWidth: 1.5,
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 6,
		margin: 4,
	},
	suggestionText: { fontSize: 12 },
	// Info box
	infoBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
		marginBottom: 20,
	},
	infoText: { flex: 1, fontSize: 13, marginLeft: 8, lineHeight: 18 },
	// Botão
	saveButton: {
		backgroundColor: Theme.primary,
		padding: 16,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
		...Shadows.primary,
	},
	saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
	// Recorrência
	recurrenceRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 12 },
	recurrenceChip: {
		borderWidth: 1.5,
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 7,
		margin: 4,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	recurrenceText: { fontSize: 13 },
});
