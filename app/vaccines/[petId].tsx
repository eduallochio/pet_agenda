import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useGoBack } from '../../hooks/useGoBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VaccineRecord } from '../../types/pet';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../hooks/useTheme';
import { SkeletonCard } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { useTranslation } from 'react-i18next';

const parseDate = (dateString: string): Date | null => {
	if (!dateString) return null;
	const parts = dateString.split('/');
	if (parts.length === 3) {
		const [day, month, year] = parts;
		return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
	}
	return null;
};

const getDaysUntil = (dateString?: string): number | null => {
	if (!dateString) return null;
	const date = parseDate(dateString);
	if (!date) return null;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatusInfo = (nextDueDate: string | undefined, t: (key: string, opts?: any) => string): { label: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap } => {
	if (!nextDueDate) return { label: t('vaccinationCard.statusNoBooster'), color: Theme.text.light, icon: 'check-circle-outline' };
	const days = getDaysUntil(nextDueDate);
	if (days === null) return { label: t('vaccinationCard.statusNoBooster'), color: Theme.text.light, icon: 'check-circle-outline' };
	if (days < 0) return { label: t('vaccinationCard.statusOverdue'), color: Theme.danger, icon: 'alert-circle' };
	if (days === 0) return { label: t('vaccinationCard.statusToday'), color: Theme.warning, icon: 'alert' };
	if (days <= 7) return { label: t('vaccinationCard.statusDaysBooster', { days }), color: Theme.warning, icon: 'clock-alert-outline' };
	if (days <= 30) return { label: t('vaccinationCard.statusDaysBooster', { days }), color: Theme.categories.Consulta.main, icon: 'clock-outline' };
	return { label: t('vaccinationCard.statusDaysBooster', { days }), color: Theme.success, icon: 'check-circle-outline' };
};

export default function VaccinationCardScreen() {
	const { petId } = useLocalSearchParams();
	const router = useRouter();
	const goBack = useGoBack('/(tabs)');
	const { colors } = useTheme();
	const { t } = useTranslation();
	const [vaccinations, setVaccinations] = useState<VaccineRecord[]>([]);
	const [loading, setLoading] = useState(true);

	useFocusEffect(
		useCallback(() => {
			const loadVaccinations = async () => {
				if (!petId) return;
				setLoading(true);
				try {
					const recordsJSON = await AsyncStorage.getItem('vaccinations');
					const allRecords: VaccineRecord[] = recordsJSON ? JSON.parse(recordsJSON) : [];
					const petRecords = allRecords
						.filter(v => v.petId === petId)
						.sort((a, b) => {
							const dateA = parseDate(a.dateAdministered)?.getTime() ?? 0;
							const dateB = parseDate(b.dateAdministered)?.getTime() ?? 0;
							return dateB - dateA; // mais recente primeiro
						});
					setVaccinations(petRecords);
				} catch (error) {
					console.error("Erro ao carregar vacinas:", error);
				} finally {
					setLoading(false);
				}
			};
			loadVaccinations();
		}, [petId])
	);

	// Estatísticas rápidas
	const total = vaccinations.length;
	const overdue = vaccinations.filter(v => {
		const days = getDaysUntil(v.nextDueDate);
		return days !== null && days < 0;
	}).length;
	const upcoming = vaccinations.filter(v => {
		const days = getDaysUntil(v.nextDueDate);
		return days !== null && days >= 0 && days <= 30;
	}).length;

	const VaccineItem = ({ item }: { item: VaccineRecord }) => {
		const status = getStatusInfo(item.nextDueDate, t);
		return (
			<TouchableOpacity
				style={[styles.vaccineItem, { backgroundColor: colors.surface }]}
				onPress={() => router.push({ pathname: '/vaccines/new', params: { petId: petId as string, vaccineId: item.id } })}
				activeOpacity={0.7}
			>
				<View style={[styles.vaccineIcon, { backgroundColor: Theme.primary + '20' }]}>
					<MaterialCommunityIcons name="needle" size={24} color={Theme.primary} />
				</View>
				<View style={styles.vaccineInfo}>
					<Text style={[styles.vaccineName, { color: colors.text.primary }]}>{item.vaccineName}</Text>
					<Text style={[styles.vaccineDate, { color: colors.text.secondary }]}>
						{t('vaccinationCard.appliedOn', { date: item.dateAdministered })}
					</Text>
					{!!item.nextDueDate && (
						<View style={styles.statusRow}>
							<MaterialCommunityIcons name={status.icon} size={14} color={status.color} />
							<Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
						</View>
					)}
				</View>
				<Ionicons name="chevron-forward" size={20} color={colors.text.light} />
			</TouchableOpacity>
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
				<Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('vaccinationCard.title')}</Text>
				<TouchableOpacity
					style={[styles.addBtn, { backgroundColor: Theme.primary }]}
					onPress={() => router.push({ pathname: '/vaccines/new', params: { petId: petId as string } })}
				>
					<Ionicons name="add" size={22} color="#fff" />
				</TouchableOpacity>
			</View>

			{/* Cards de estatísticas */}
			{!loading && total > 0 && (
				<View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: colors.text.primary }]}>{total}</Text>
						<Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('vaccinationCard.statTotal')}</Text>
					</View>
					<View style={[styles.statDivider, { backgroundColor: colors.border }]} />
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: overdue > 0 ? Theme.danger : Theme.success }]}>{overdue}</Text>
						<Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('vaccinationCard.statOverdue')}</Text>
					</View>
					<View style={[styles.statDivider, { backgroundColor: colors.border }]} />
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: upcoming > 0 ? Theme.warning : colors.text.primary }]}>{upcoming}</Text>
						<Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('vaccinationCard.statUpcoming')}</Text>
					</View>
				</View>
			)}

			<View style={styles.content}>
				{loading ? (
					<>
						<SkeletonCard />
						<SkeletonCard />
						<SkeletonCard />
					</>
				) : vaccinations.length > 0 ? (
					<FlatList
						data={vaccinations}
						renderItem={({ item }) => <VaccineItem item={item} />}
						keyExtractor={item => item.id}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingBottom: 20 }}
					/>
				) : (
					<EmptyState
						icon="needle"
						iconLib="mci"
						title={t('vaccinationCard.emptyTitle')}
						message={t('vaccinationCard.emptyMsg')}
						hint={t('vaccinationCard.emptyHint')}
						actionLabel={t('vaccinationCard.addVaccine')}
						onAction={() => router.push({ pathname: '/vaccines/new', params: { petId: petId as string } })}
					/>
				)}
			</View>
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
	addBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
	// Stats
	statsRow: {
		flexDirection: 'row',
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderBottomWidth: 1,
	},
	statItem: { flex: 1, alignItems: 'center' },
	statValue: { fontSize: 22, fontWeight: 'bold' },
	statLabel: { fontSize: 12, marginTop: 2 },
	statDivider: { width: 1, marginHorizontal: 8 },
	// Lista
	content: { flex: 1, padding: 16 },
	vaccineItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 14,
		borderRadius: 14,
		marginBottom: 10,
		...Shadows.small,
	},
	vaccineIcon: {
		width: 46,
		height: 46,
		borderRadius: 23,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	vaccineInfo: { flex: 1 },
	vaccineName: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
	vaccineDate: { fontSize: 13, marginBottom: 3 },
	statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
	statusText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
});
