import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncReminders } from '../../services/syncService';
import { autoCompleteChallenge } from '../../hooks/useChallenges';
import { Ionicons } from '@expo/vector-icons';
import { Pet, Reminder } from '../../types/pet';
import AdBanner from '../../components/AdBanner';
import { Theme, getCategoryColor } from '../../constants/Colors';
import PetAvatar from '../../components/PetAvatar';
import EmptyState from '../../components/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { useGoBack } from '../../hooks/useGoBack';
import { useTranslation } from 'react-i18next';


export default function PetDetailScreen() {
	const { id } = useLocalSearchParams();
	const router = useRouter();
	const goBack = useGoBack('/(tabs)');
	const { colors } = useTheme();
	const { t } = useTranslation();
	const [pet, setPet] = useState<Pet | null>(null);
	const [reminders, setReminders] = useState<Reminder[]>([]);
	const [loading, setLoading] = useState(true);

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
					if (__DEV__) console.error('Erro ao carregar dados do pet:', error);
				} finally {
					setLoading(false);
				}
			};
			loadData();
		}, [id])
	);

	const calcAge = (dob: string): string => {
		if (!dob) return '';
		const parts = dob.split('/');
		if (parts.length !== 3) return '';
		const birth = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
		const today = new Date();
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

	const calcSize = (weight?: number): string => {
		if (!weight) return '—';
		if (weight <= 5) return t('petDetail.sizeSmall');
		if (weight <= 20) return t('petDetail.sizeMedium');
		return t('petDetail.sizeLarge');
	};


	const markReminderDone = async (reminderId: string) => {
		const json = await AsyncStorage.getItem('reminders');
		const all: Reminder[] = json ? JSON.parse(json) : [];
		const updated = all.map(r =>
			r.id === reminderId ? { ...r, completed: true, completedAt: new Date().toISOString() } : r
		);
		await syncReminders(updated);
		setReminders(updated.filter(r => r.petId === id));
	};

	const parseDateSafe = (s: string): number => {
		const p = s.split('/');
		if (p.length === 3) {
			const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
			return isNaN(d.getTime()) ? Infinity : d.getTime();
		}
		return Infinity;
	};

	const upcomingReminders = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return reminders
			.filter(r => {
				if (r.completed) return false;
				const t = parseDateSafe(r.date);
				return t !== Infinity && t >= today.getTime();
			})
			.sort((a, b) => parseDateSafe(a.date) - parseDateSafe(b.date));
	}, [reminders]);

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
			case 'Saúde': return 'medkit-outline';
			case 'Higiene': return 'color-filter-outline';
			case 'Consulta': return 'pulse-outline';
			case 'Prevenção': return 'shield-checkmark-outline';
			default: return 'ellipse-outline';
		}
	};

	const ReminderItem = ({ item }: { item: Reminder }) => {
		const categoryColor = getCategoryColor(item.category as any);
		return (
			<View style={[styles.eventItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<View style={[styles.eventBar, { backgroundColor: categoryColor.main }]} />
				<TouchableOpacity
					style={styles.eventMainArea}
					onPress={() => router.push({ pathname: '/reminder/new', params: { petId: pet.id, reminderId: item.id } })}
					activeOpacity={0.7}
				>
					<View style={[styles.eventIconCircle, { backgroundColor: categoryColor.main + '20' }]}>
						<Ionicons name={getCategoryIcon(item.category)} size={18} color={categoryColor.main} />
					</View>
					<View style={styles.eventContent}>
						<Text style={[styles.eventTitle, { color: colors.text.primary }]} numberOfLines={1}>
							{item.description}
						</Text>
						<Text style={[styles.eventDate, { color: colors.text.secondary }]}>
							{item.date}
						</Text>
					</View>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.doneBtn, { backgroundColor: Theme.primary + '15' }]}
					onPress={() => markReminderDone(item.id)}
					activeOpacity={0.7}
				>
					<Ionicons name="checkmark-circle-outline" size={22} color={Theme.primary} />
				</TouchableOpacity>
			</View>
		);
	};

	const quickActions = [
		{
			icon: 'ribbon-outline' as keyof typeof Ionicons.glyphMap,
			label: t('petDetail.passport'),
			onPress: () => router.push({ pathname: '/pet/passport', params: { petId: pet.id } } as any),
		},
		{
			icon: 'medkit-outline' as keyof typeof Ionicons.glyphMap,
			label: t('petDetail.vaccines'),
			onPress: () => router.push({ pathname: '/vaccines/[petId]', params: { petId: pet.id } }),
		},
		{
			icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap,
			label: t('petDetail.achievements'),
			onPress: () => router.push('/conquistas' as any),
		},
		{
			icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
			label: t('petDetail.history'),
			onPress: () => router.push({ pathname: '/pet/diary', params: { petId: pet.id } } as any),
		},
	];

	const infoRows = [
		pet.dob
			? { icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap, label: t('petDetail.birthdate'), value: pet.dob }
			: null,
		pet.castrated !== undefined
			? { icon: 'cut-outline' as keyof typeof Ionicons.glyphMap, label: t('petDetail.castrated'), value: pet.castrated ? t('petDetail.yes') : t('petDetail.no') }
			: null,
		pet.microchip
			? { icon: 'barcode-outline' as keyof typeof Ionicons.glyphMap, label: 'Microchip', value: pet.microchip }
			: null,
	].filter(Boolean) as { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[];

	const listHeader = (
		<>
			{/* Pet Card */}
			<View style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<View style={styles.avatarContainer}>
					<PetAvatar species={pet.species} photoUri={pet.photoUri} size="xlarge" />
				</View>

				<Text style={[styles.petName, { color: colors.text.primary }]}>{pet.name}</Text>

				<TouchableOpacity
					onPress={() => pet.breed ? router.push({ pathname: '/breed-info', params: { breed: pet.breed, species: pet.species ?? '' } }) : undefined}
					disabled={!pet.breed}
					activeOpacity={pet.breed ? 0.6 : 1}
				>
					<Text style={[styles.petSubtitle, { color: colors.text.secondary }]}>
						{[pet.breed, pet.gender === 'Macho' ? t('petDetail.male') : pet.gender === 'Fêmea' ? t('petDetail.female') : pet.gender].filter(Boolean).join(' • ')}
					</Text>
				</TouchableOpacity>

				{/* Stats row */}
				<View style={[styles.statsRow, { borderTopColor: colors.border }]}>
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: colors.text.primary }]}>
							{pet.dob ? calcAge(pet.dob) : '—'}
						</Text>
						<Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('petDetail.age')}</Text>
					</View>
					<View style={[styles.statDivider, { backgroundColor: colors.border }]} />
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: colors.text.primary }]}>
							{pet.weight ? `${pet.weight} kg` : '—'}
						</Text>
						<Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('petDetail.weight')}</Text>
					</View>
					<View style={[styles.statDivider, { backgroundColor: colors.border }]} />
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: colors.text.primary }]}>
							{calcSize(pet.weight)}
						</Text>
						<Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('petDetail.size')}</Text>
					</View>
				</View>
			</View>

			{/* Info Card */}
			{infoRows.length > 0 && (
				<View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					{infoRows.map((row, index) => (
						<View key={row.label}>
							<View style={styles.infoRow}>
								<View style={styles.infoIconLabel}>
									<Ionicons name={row.icon} size={18} color={Theme.primary} style={styles.infoIcon} />
									<Text style={[styles.infoLabel, { color: colors.text.secondary }]}>{row.label}</Text>
								</View>
								<Text style={[styles.infoValue, { color: colors.text.primary }]}>{row.value}</Text>
							</View>
							{index < infoRows.length - 1 && (
								<View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
							)}
						</View>
					))}
				</View>
			)}

			{/* Ações Rápidas */}
			<View style={styles.sectionBlock}>
				<Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('petDetail.quickActions')}</Text>
				<View style={[styles.quickActionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					{quickActions.map((action, index) => (
						<TouchableOpacity
							key={action.label}
							style={[
								styles.quickActionItem,
								index < quickActions.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border },
							]}
							onPress={action.onPress}
							activeOpacity={0.7}
						>
							<View style={[styles.quickActionIconCircle, { backgroundColor: Theme.primary + '18' }]}>
								<Ionicons name={action.icon} size={22} color={Theme.primary} />
							</View>
							<Text style={[styles.quickActionLabel, { color: colors.text.secondary }]}>{action.label}</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* Banner de anúncio */}
			<View style={{ alignItems: 'center', marginVertical: 8 }}>
				<AdBanner />
			</View>

			{/* Próximos Eventos */}
			<View style={styles.sectionBlock}>
				<View style={styles.sectionHeaderRow}>
					<Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('petDetail.upcomingEvents')}</Text>
					<TouchableOpacity
						onPress={() => router.push({ pathname: '/reminder/new', params: { petId: pet.id } })}
					>
						<Ionicons name="add-circle-outline" size={22} color={Theme.primary} />
					</TouchableOpacity>
				</View>
			</View>
		</>
	);

	const listEmpty = (
		<View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
			<EmptyState
				icon="calendar-outline"
				title={t('petDetail.noReminders')}
				message={t('petDetail.noRemindersMsg')}
				actionLabel={t('petDetail.addReminder')}
				onAction={() => router.push({ pathname: '/reminder/new', params: { petId: pet.id } })}
				style={{ paddingVertical: 32 }}
			/>
		</View>
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header */}
			<View style={[styles.header, { backgroundColor: colors.background }]}>
				<TouchableOpacity style={styles.headerBtn} onPress={goBack}>
					<Ionicons name="arrow-back" size={24} color={colors.text.primary} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('petDetail.title')}</Text>
				<TouchableOpacity
					style={styles.headerBtn}
					onPress={() => router.push({ pathname: '/pet/edit', params: { id: pet.id } })}
				>
					<Ionicons name="create-outline" size={22} color={Theme.primary} />
				</TouchableOpacity>
			</View>

			<FlatList
				data={upcomingReminders}
				renderItem={({ item }) => <ReminderItem item={item} />}
				keyExtractor={item => item.id}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={listEmpty}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={styles.listContent}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	listContent: { paddingBottom: 40 },

	// Header
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 12,
	},
	headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
	headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },

	// Pet Card
	petCard: {
		marginHorizontal: 16,
		marginTop: 12,
		marginBottom: 12,
		borderRadius: 16,
		borderWidth: 1,
		alignItems: 'center',
		paddingTop: 24,
		paddingBottom: 0,
		overflow: 'hidden',
	},
	avatarContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: Theme.primary + '20',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
		overflow: 'hidden',
	},
	petName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
	petSubtitle: { fontSize: 14, marginBottom: 20 },
	statsRow: {
		flexDirection: 'row',
		width: '100%',
		borderTopWidth: 1,
		marginTop: 4,
	},
	statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
	statValue: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
	statLabel: { fontSize: 12 },
	statDivider: { width: 1, marginVertical: 12 },

	// Info Card
	infoCard: {
		marginHorizontal: 16,
		marginBottom: 12,
		borderRadius: 16,
		borderWidth: 1,
		overflow: 'hidden',
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	infoIconLabel: { flexDirection: 'row', alignItems: 'center' },
	infoIcon: { marginRight: 10 },
	infoLabel: { fontSize: 14 },
	infoValue: { fontSize: 14, fontWeight: '600' },
	infoDivider: { height: 1, marginHorizontal: 16 },

	// Quick Actions
	sectionBlock: { marginHorizontal: 16, marginBottom: 12 },
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
	quickActionsCard: {
		flexDirection: 'row',
		borderRadius: 16,
		borderWidth: 1,
		overflow: 'hidden',
	},
	quickActionItem: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 16,
		gap: 8,
	},
	quickActionIconCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	quickActionLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

	// Events
	eventItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 16,
		marginBottom: 8,
		borderRadius: 12,
		borderWidth: 1,
		overflow: 'hidden',
	},
	eventBar: { width: 4, alignSelf: 'stretch' },
	eventIconCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 12,
	},
	eventMainArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
	eventContent: { flex: 1, paddingVertical: 14 },
	eventTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
	eventDate: { fontSize: 12 },
	doneBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },

	errorText: { fontSize: 18, textAlign: 'center', marginTop: 50 },
});
