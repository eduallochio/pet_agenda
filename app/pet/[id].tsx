import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Share, Alert, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncReminders } from '../../services/syncService';
import { autoCompleteChallenge } from '../../hooks/useChallenges';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pet, Reminder } from '../../types/pet';
import { Theme, getCategoryColor } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import Badge from '../../components/Badge';
import PetAvatar from '../../components/PetAvatar';
import EmptyState from '../../components/EmptyState';
import SearchBar from '../../components/SearchBar';
import FilterChips from '../../components/FilterChips';
import { useTheme } from '../../hooks/useTheme';
import { useGoBack } from '../../hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { cancelNotifications, scheduleReminderNotification } from '../../services/notificationService';
import EmergencyPanel from '../../components/EmergencyPanel';

export default function PetDetailScreen() {
	const { id } = useLocalSearchParams();
	const router = useRouter();
	const goBack = useGoBack('/(tabs)');
	const { colors } = useTheme();
	const { t } = useTranslation();
	const [pet, setPet] = useState<Pet | null>(null);
	const [reminders, setReminders] = useState<Reminder[]>([]);
	const [loading, setLoading] = useState(true);

	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [showEmergency, setShowEmergency] = useState(false);

	useFocusEffect(
		useCallback(() => {
			const loadData = async () => {
				if (!id) return;
				setLoading(true);
				try {
					const petsJSON = await AsyncStorage.getItem('pets');
					const allPets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
					const foundPet = allPets.find(p => p.id === id);
					setPet(foundPet || null);
					await autoCompleteChallenge('view_pet');

					const remindersJSON = await AsyncStorage.getItem('reminders');
					const allReminders: Reminder[] = remindersJSON ? JSON.parse(remindersJSON) : [];
					const petReminders = allReminders.filter(r => r.petId === id);
					setReminders(petReminders);
				} catch (error) {
					console.error("Erro ao carregar dados do pet:", error);
				} finally {
					setLoading(false);
				}
			};
			loadData();
		}, [id])
	);

	const getReminderUrgency = (dateStr: string): { variant: 'danger' | 'warning' | 'info'; label: string } => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const parts = dateStr.split('/');
		let reminderDate: Date;
		if (parts.length === 3) {
			reminderDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
		} else {
			reminderDate = new Date(dateStr);
		}
		reminderDate.setHours(0, 0, 0, 0);

		const diffTime = reminderDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0) return { variant: 'danger', label: t('petDetail.overdue') };
		if (diffDays === 0) return { variant: 'warning', label: t('petDetail.today') };
		if (diffDays <= 7) return { variant: 'warning', label: `${diffDays}d` };
		return { variant: 'info', label: `${diffDays}d` };
	};

	const filteredReminders = useMemo(() => {
		let filtered = [...reminders];

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(r =>
				r.description.toLowerCase().includes(query) ||
				r.category.toLowerCase().includes(query)
			);
		}

		if (selectedCategories.length > 0) {
			filtered = filtered.filter(r => selectedCategories.includes(r.category));
		}

		filtered.sort((a, b) => {
			const parseDate = (s: string) => {
				const p = s.split('/');
				if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])).getTime();
				return new Date(s).getTime();
			};
			return parseDate(a.date) - parseDate(b.date);
		});

		return filtered;
	}, [reminders, searchQuery, selectedCategories]);

	const categoryChips = useMemo(() => [
		{ id: 'Saúde', label: 'Saúde', icon: 'medical' as keyof typeof Ionicons.glyphMap, color: getCategoryColor('Saúde').main },
		{ id: 'Higiene', label: 'Higiene', icon: 'water' as keyof typeof Ionicons.glyphMap, color: getCategoryColor('Higiene').main },
		{ id: 'Consulta', label: 'Consulta', icon: 'calendar' as keyof typeof Ionicons.glyphMap, color: getCategoryColor('Consulta').main },
		{ id: 'Prevenção', label: 'Prevenção', icon: 'shield-checkmark' as keyof typeof Ionicons.glyphMap, color: getCategoryColor('Prevenção').main },
	], []);

	const toggleCategoryFilter = (category: string) => {
		setSelectedCategories(prev =>
			prev.includes(category)
				? prev.filter(c => c !== category)
				: [...prev, category]
		);
	};

	const clearFilters = () => {
		setSearchQuery('');
		setSelectedCategories([]);
	};

	const toggleReminderDone = async (reminder: Reminder) => {
		try {
			const nowDone = !reminder.completed;
			const json = await AsyncStorage.getItem('reminders');
			const all: Reminder[] = json ? JSON.parse(json) : [];

			let newNotificationIds: string[] | undefined = reminder.notificationIds;

			if (nowDone) {
				// Marcar como feito: cancelar todas as notificações pendentes
				if (reminder.notificationIds?.length) {
					await cancelNotifications(reminder.notificationIds);
				}
				newNotificationIds = [];
			} else {
				// Desmarcar: reagendar notificações se a data ainda for futura
				const petJson = await AsyncStorage.getItem('pets');
				const allPets: Pet[] = petJson ? JSON.parse(petJson) : [];
				const foundPet = allPets.find(p => p.id === reminder.petId);
				if (foundPet) {
					const parts = reminder.date.split('/');
					const reminderDate = parts.length === 3
						? new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
						: new Date(reminder.date);
					if (reminderDate > new Date()) {
						newNotificationIds = await scheduleReminderNotification(
							reminder.id,
							foundPet.name,
							reminder.description,
							reminderDate,
							reminder.category,
						);
					}
				}
			}

			const updated = all.map(r =>
				r.id === reminder.id
					? { ...r, completed: nowDone, completedAt: nowDone ? new Date().toISOString() : undefined, notificationIds: newNotificationIds }
					: r
			);
			await syncReminders(updated);
			setReminders(prev => prev.map(r =>
				r.id === reminder.id
					? { ...r, completed: nowDone, completedAt: nowDone ? new Date().toISOString() : undefined, notificationIds: newNotificationIds }
					: r
			));
		} catch { }
	};

	const sharePet = async () => {
		if (!pet) return;

		const today = new Date();
		const calcAge = (dob: string): string => {
			const parts = dob.split('/');
			if (parts.length !== 3) return '';
			const birth = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
			const years = today.getFullYear() - birth.getFullYear();
			const hadBirthday =
				today.getMonth() > birth.getMonth() ||
				(today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
			const age = hadBirthday ? years : years - 1;
			if (age <= 0) {
				const months =
					(today.getFullYear() - birth.getFullYear()) * 12 +
					(today.getMonth() - birth.getMonth());
				return months <= 1 ? '1 mês' : `${months} meses`;
			}
			return age === 1 ? '1 ano' : `${age} anos`;
		};

		const lines: string[] = [];
		lines.push(`🐾 ${pet.name}`);
		if (pet.species) lines.push(`Espécie: ${pet.species}${pet.breed ? ` · ${pet.breed}` : ''}`);
		if (pet.dob) lines.push(`Idade: ${calcAge(pet.dob)} (nascido em ${pet.dob})`);
		lines.push(`Lembretes: ${reminders.length}`);
		lines.push('');
		lines.push('Registrado com Pet Agenda 🐶');

		try {
			await Share.share({ message: lines.join('\n') });
		} catch (err) {
			Alert.alert(t('common.error'), t('petDetail.shareError'));
		}
	};

	if (loading) {
		return <ActivityIndicator size="large" color={Theme.primary} style={{ flex: 1 }} />;
	}

	if (!pet) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.errorText, { color: colors.text.primary }]}>{t('petDetail.petNotFound')}</Text>
			</SafeAreaView>
		);
	}

	const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
		switch (category) {
			case 'Saúde': return 'medical';
			case 'Higiene': return 'water';
			case 'Consulta': return 'calendar';
			case 'Prevenção': return 'shield-checkmark';
			default: return 'ellipse-outline';
		}
	};

	const ReminderItem = ({ item }: { item: Reminder }) => {
		const categoryColor = getCategoryColor(item.category as any);
		const urgency = getReminderUrgency(item.date);
		const done = !!item.completed;
		return (
			<TouchableOpacity
				style={[
					styles.reminderItem,
					{
						backgroundColor: colors.surface,
						borderLeftColor: done ? '#4CAF50' : categoryColor.main,
						opacity: done ? 0.75 : 1,
						...Shadows.small,
					}
				]}
				onPress={() => !done && router.push({ pathname: '/reminder/new', params: { petId: pet.id, reminderId: item.id } })}
				activeOpacity={0.7}
			>
				{/* Checkbox de concluído */}
				<TouchableOpacity
					style={[
						styles.checkbox,
						done
							? { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
							: { backgroundColor: 'transparent', borderColor: colors.border },
					]}
					onPress={() => toggleReminderDone(item)}
					hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				>
					{done && <Ionicons name="checkmark" size={14} color="#fff" />}
				</TouchableOpacity>

				<View style={[styles.categoryIconCircle, { backgroundColor: done ? '#4CAF5020' : categoryColor.main + '20' }]}>
					<Ionicons name={done ? 'checkmark-circle' : getCategoryIcon(item.category)} size={20} color={done ? '#4CAF50' : categoryColor.main} />
				</View>

				<View style={styles.reminderTextContainer}>
					<View style={styles.reminderHeader}>
						<Text style={[
							styles.reminderDescription,
							{ color: done ? colors.text.light : colors.text.primary },
							done && styles.strikethrough,
						]} numberOfLines={1}>
							{item.description}
						</Text>
						{!done && <Badge variant={urgency.variant} label={urgency.label} small />}
						{done && (
							<View style={styles.doneBadge}>
								<Text style={styles.doneBadgeText}>{t('petDetail.done')}</Text>
							</View>
						)}
					</View>
					<View style={styles.reminderMeta}>
						{done && item.completedAt ? (
							<Text style={[styles.reminderDate, { color: '#4CAF50', fontWeight: '600' }]}>
								{t('petDetail.completedAt', { date: new Date(item.completedAt).toLocaleDateString() })}
							</Text>
						) : (
							<>
								<Text style={[styles.categoryLabel, { color: categoryColor.dark, backgroundColor: categoryColor.main + '20' }]}>
									{item.category}
								</Text>
								<Text style={[styles.reminderDate, { color: colors.text.secondary }]}>
									{item.date}
								</Text>
							</>
						)}
					</View>
				</View>
				{!done && <Ionicons name="chevron-forward" size={18} color={colors.text.light} />}
			</TouchableOpacity>
		);
	};

	const listHeader = (
		<>
			{/* Pet info card */}
			<View style={[styles.petCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				<PetAvatar species={pet.species} photoUri={pet.photoUri} size="xlarge" />
				<View style={styles.petInfo}>
					<Text style={[styles.petName, { color: colors.text.primary }]}>{pet.name}</Text>
					{!!(pet.species || pet.breed) && (
						<View style={styles.petMetaRow}>
							<Ionicons name="paw-outline" size={13} color={colors.text.light} style={{ marginRight: 4 }} />
							<Text style={[styles.petMeta, { color: colors.text.secondary }]}>
								{[pet.species, pet.breed].filter(Boolean).join(' · ')}
							</Text>
						</View>
					)}
					{!!pet.dob && (
						<View style={styles.petMetaRow}>
							<Ionicons name="calendar-outline" size={13} color={colors.text.light} style={{ marginRight: 4 }} />
							<Text style={[styles.petMeta, { color: colors.text.secondary }]}>
								{pet.dob}
							</Text>
						</View>
					)}
					{!!pet.breed && (
						<TouchableOpacity
							onPress={() => router.push({ pathname: "/breed-info", params: { breed: pet.breed, species: pet.species } } as any)}
							style={styles.breedLink}
						>
							<Ionicons name="information-circle-outline" size={14} color={Theme.primary} style={{ marginRight: 4 }} />
							<Text style={[styles.breedLinkText, { color: Theme.primary }]}>Ver info da raça</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Action buttons — grid 2 linhas */}
			<View style={[styles.actionsSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				{/* Linha 1: Vacinas (destaque) + Peso */}
				<View style={styles.actionsRow}>
					<TouchableOpacity
						style={[styles.actionBtnPrimary, { backgroundColor: Theme.primary, shadowColor: Theme.primary }]}
						onPress={() => router.push({ pathname: '/vaccines/[petId]', params: { petId: pet.id } })}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="needle" size={20} color="#fff" />
						<Text style={styles.actionBtnPrimaryText}>{t('petDetail.vaccines')}</Text>
						<Ionicons name="chevron-forward" size={16} color="#fff" />
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionBtnSecondary, { backgroundColor: '#9C27B0' + '15', borderColor: '#9C27B0' + '40' }]}
						onPress={() => router.push({ pathname: '/pet/weight', params: { id: pet.id, name: pet.name, species: pet.species } } as any)}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="scale-bathroom" size={20} color="#9C27B0" />
						<Text style={[styles.actionBtnSecondaryText, { color: '#9C27B0' }]}>{t('petDetail.weight')}</Text>
					</TouchableOpacity>
				</View>
				{/* Linha 2: Documentos, Diário, Medicamentos */}
				<View style={styles.actionsRow}>
					<TouchableOpacity
						style={[styles.actionBtnTertiary, { backgroundColor: '#607D8B' + '15', borderColor: '#607D8B' + '40' }]}
						onPress={() => router.push({ pathname: '/pet/documents', params: { petId: pet.id } } as any)}
						activeOpacity={0.8}
					>
						<Ionicons name="document-text-outline" size={18} color="#607D8B" />
						<Text style={[styles.actionBtnTertiaryText, { color: '#607D8B' }]}>{t('petDetail.documents')}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionBtnTertiary, { backgroundColor: '#00897B' + '15', borderColor: '#00897B' + '40' }]}
						onPress={() => router.push({ pathname: '/pet/diary', params: { petId: pet.id } } as any)}
						activeOpacity={0.8}
					>
						<Ionicons name="journal-outline" size={18} color="#00897B" />
						<Text style={[styles.actionBtnTertiaryText, { color: '#00897B' }]}>{t('petDetail.diary')}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionBtnTertiary, { backgroundColor: '#E91E63' + '15', borderColor: '#E91E63' + '40' }]}
						onPress={() => router.push({ pathname: '/pet/medications', params: { petId: pet.id } } as any)}
						activeOpacity={0.8}
					>
						<Ionicons name="medical-outline" size={18} color="#E91E63" />
						<Text style={[styles.actionBtnTertiaryText, { color: '#E91E63' }]}>{t('medications.title')}</Text>
					</TouchableOpacity>
				</View>
				{/* Linha 3: Fotos, Alimentação, Contatos Emergência */}
				<View style={styles.actionsRow}>
					<TouchableOpacity
						style={[styles.actionBtnTertiary, { backgroundColor: '#FF5722' + '15', borderColor: '#FF5722' + '40' }]}
						onPress={() => router.push({ pathname: '/pet/photos', params: { petId: pet.id, petName: pet.name } } as any)}
						activeOpacity={0.8}
					>
						<Ionicons name="images-outline" size={18} color="#FF5722" />
						<Text style={[styles.actionBtnTertiaryText, { color: '#FF5722' }]}>{t('petDetail.photos')}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionBtnTertiary, { backgroundColor: '#8BC34A' + '15', borderColor: '#8BC34A' + '40' }]}
						onPress={() => router.push({ pathname: '/pet/feeding', params: { petId: pet.id, petName: pet.name } } as any)}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="food-variant" size={18} color="#8BC34A" />
						<Text style={[styles.actionBtnTertiaryText, { color: '#8BC34A' }]}>{t('petDetail.feeding')}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionBtnTertiary, { backgroundColor: '#2196F3' + '15', borderColor: '#2196F3' + '40' }]}
						onPress={() => router.push({ pathname: '/pet/emergency-contacts', params: { petId: pet.id, petName: pet.name } } as any)}
						activeOpacity={0.8}
					>
						<Ionicons name="call-outline" size={18} color="#2196F3" />
						<Text style={[styles.actionBtnTertiaryText, { color: '#2196F3' }]}>{t('petDetail.emergencyContacts')}</Text>
					</TouchableOpacity>
				</View>
				{/* Botão Emergência — destaque vermelho */}
				<TouchableOpacity
					style={styles.emergencyBtn}
					onPress={() => setShowEmergency(true)}
					activeOpacity={0.8}
				>
					<Ionicons name="alert-circle" size={20} color="#fff" />
					<Text style={styles.emergencyBtnText}>{t('petDetail.emergency')}</Text>
				</TouchableOpacity>
			</View>

			{/* Reminders section header */}
			<View style={styles.remindersSectionHeader}>
				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('petDetail.reminders')}</Text>
					<TouchableOpacity
						style={[styles.addButton, Shadows.primary]}
						onPress={() => router.push({ pathname: '/reminder/new', params: { petId: pet.id } })}
					>
						<Ionicons name="add" size={22} color="#fff" />
					</TouchableOpacity>
				</View>

				{reminders.length > 0 && (
					<View style={styles.searchFilterContainer}>
						<SearchBar
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder={t('common.search') + '...'}
						/>
						<FilterChips
							chips={categoryChips}
							selectedIds={selectedCategories}
							onToggle={toggleCategoryFilter}
							onClearAll={clearFilters}
						/>
					</View>
				)}
			</View>
		</>
	);

	const listEmpty = reminders.length > 0 ? (
		<EmptyState
			icon="search"
			title={t('common.noResults')}
			message={t('common.noResultsMsg')}
			actionLabel={t('common.clearFilters')}
			onAction={clearFilters}
			style={{ paddingVertical: 40 }}
		/>
	) : (
		<EmptyState
			icon="calendar-outline"
			title={t('petDetail.noReminders')}
			message={t('petDetail.noRemindersMsg')}
			hint={t('petDetail.noRemindersHint')}
			actionLabel={t('petDetail.addReminder')}
			onAction={() => router.push({ pathname: '/reminder/new', params: { petId: pet.id } })}
			style={{ paddingVertical: 40 }}
		/>
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header fixo */}
			<View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				<TouchableOpacity style={styles.headerBtn} onPress={goBack}>
					<Ionicons name="arrow-back" size={24} color={colors.text.primary} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
					{pet.name}
				</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity
						style={styles.headerBtn}
						onPress={() => router.push({ pathname: '/pet/passport', params: { petId: pet.id } } as any)}
					>
						<Ionicons name="ribbon-outline" size={24} color="#FFB800" />
					</TouchableOpacity>
					<TouchableOpacity style={styles.headerBtn} onPress={sharePet}>
						<Ionicons name="share-social-outline" size={24} color={Theme.primary} />
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.headerBtn}
						onPress={() => router.push({ pathname: '/pet/edit', params: { id: pet.id } })}
					>
						<Ionicons name="create-outline" size={24} color={Theme.primary} />
					</TouchableOpacity>
				</View>
			</View>

			{/* FlatList que rola toda a tela */}
			<FlatList
				data={filteredReminders}
				renderItem={({ item }) => <ReminderItem item={item} />}
				keyExtractor={item => item.id}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={listEmpty}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={styles.listContent}
			/>

			<EmergencyPanel
				visible={showEmergency}
				petId={pet.id}
				onClose={() => setShowEmergency(false)}
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
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
	headerActions: { flexDirection: 'row', alignItems: 'center' },
	headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
	// Pet card
	petCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
	},
	petInfo: { flex: 1, marginLeft: 16 },
	petName: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
	petMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
	breedLink: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
	breedLinkText: { fontSize: 13, fontWeight: '600' },
	petMeta: { fontSize: 14 },
	// Action buttons grid
	actionsSection: {
		padding: 12,
		borderBottomWidth: 1,
		gap: 8,
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 8,
	},
	// Botão principal (Vacinas) — linha cheia, destaque
	actionBtnPrimary: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 14,
		...Platform.select({ default: { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 }, web: {} }),
	},
	actionBtnPrimaryText: {
		flex: 1,
		color: '#fff',
		fontSize: 15,
		fontWeight: '700',
		textAlign: 'center',
	},
	// Botão secundário (Peso) — meia largura, estilo outline
	actionBtnSecondary: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderRadius: 14,
		borderWidth: 1.5,
	},
	actionBtnSecondaryText: {
		fontSize: 13,
		fontWeight: '600',
		textAlign: 'center',
	},
	// Botão terciário (Documentos, Diário, Med) — 1/3 largura, compacto
	actionBtnTertiary: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
		paddingVertical: 10,
		paddingHorizontal: 4,
		borderRadius: 12,
		borderWidth: 1.5,
	},
	actionBtnTertiaryText: {
		fontSize: 11,
		fontWeight: '600',
		textAlign: 'center',
	},
	// Reminders
	listContent: { paddingBottom: 32 },
	remindersSectionHeader: { padding: 16, paddingBottom: 0 },
	sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
	sectionTitle: { fontSize: 18, fontWeight: '800' },
	searchFilterContainer: { marginBottom: 12 },
	addButton: {
		backgroundColor: Theme.primary,
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
	},
	reminderItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		marginHorizontal: 16,
		borderRadius: 16,
		marginBottom: 10,
		borderLeftWidth: 4,
	},
	categoryIconCircle: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	reminderTextContainer: { flex: 1 },
	reminderHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	reminderDescription: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
	reminderMeta: { flexDirection: 'row', alignItems: 'center' },
	categoryLabel: {
		fontSize: 11,
		fontWeight: '600',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		marginRight: 8,
		overflow: 'hidden',
	},
	reminderDate: { fontSize: 13 },
	errorText: { fontSize: 18, textAlign: 'center', marginTop: 50 },
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 10,
	},
	strikethrough: {
		textDecorationLine: 'line-through',
	},
	doneBadge: {
		backgroundColor: '#4CAF5020',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	doneBadgeText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#4CAF50',
	},
	emergencyBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: '#F44336',
		borderRadius: 12,
		paddingVertical: 12,
		...Platform.select({ default: { shadowColor: '#F44336', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }, web: {} }),
	},
	emergencyBtnText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '700',
	},
});
