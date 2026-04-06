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
					if (__DEV__) console.error("Erro ao carregar vacinas:", error);
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

	const clearNextDue = async (vaccineId: string) => {
		const json = await AsyncStorage.getItem('vaccinations');
		const all: VaccineRecord[] = json ? JSON.parse(json) : [];
		const updated = all.map(v =>
			v.id === vaccineId ? { ...v, nextDueDate: undefined } : v
		);
		await AsyncStorage.setItem('vaccinations', JSON.stringify(updated));
		setVaccinations(updated.filter(v => v.petId === petId));
	};

	const VaccineItem = ({ item }: { item: VaccineRecord }) => {
		const status = getStatusInfo(item.nextDueDate, t);
		const days = getDaysUntil(item.nextDueDate);
		const isOverdue = days !== null && days < 0;
		const isDueSoon = days !== null && days >= 0 && days <= 30;
		const needsAction = isOverdue || isDueSoon;

		return (
			<View style={[styles.vaccineItem, { backgroundColor: colors.surface }]}>
				<TouchableOpacity
					style={styles.vaccineItemMain}
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

				{needsAction && (
					<View style={[styles.actionRow, { borderTopColor: colors.border }]}>
						{/* Confirmar reforço: edita a vacina original com nova data */}
						<TouchableOpacity
							style={[styles.actionBtn, { backgroundColor: isOverdue ? Theme.danger + '12' : Theme.warning + '12' }]}
							onPress={() => router.push({ pathname: '/vaccines/new', params: { petId: petId as string, vaccineId: item.id } })}
						>
							<MaterialCommunityIcons name="needle" size={14} color={isOverdue ? Theme.danger : Theme.warning} />
							<Text style={[styles.actionBtnText, { color: isOverdue ? Theme.danger : Theme.warning }]}>
								{isOverdue ? 'Confirmar reforço' : 'Registrar reforço'}
							</Text>
						</TouchableOpacity>
						{/* Sem próxima dose: limpa o nextDueDate */}
						<TouchableOpacity
							style={[styles.actionBtn, { backgroundColor: colors.border + '60' }]}
							onPress={() => clearNextDue(item.id)}
						>
							<Ionicons name="close-circle-outline" size={14} color={colors.text.secondary} />
							<Text style={[styles.actionBtnText, { color: colors.text.secondary }]}>Sem próxima dose</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		);
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header */}
			<View style={[styles.header, { backgroundColor: colors.background }]}>
				<TouchableOpacity style={styles.headerBtn} onPress={goBack}>
					<Ionicons name="arrow-back" size={24} color={colors.text.primary} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('vaccinationCard.title')}</Text>
				<TouchableOpacity
					style={styles.headerBtn}
					onPress={() => router.push({ pathname: '/vaccines/new', params: { petId: petId as string } })}
				>
					<Ionicons name="add" size={26} color={Theme.primary} />
				</TouchableOpacity>
			</View>

			{/* Stats */}
			{!loading && total > 0 && (
				<View style={styles.statsRow}>
					{[
						{ value: total, label: t('vaccinationCard.statTotal'), color: colors.text.primary },
						{ value: overdue, label: t('vaccinationCard.statOverdue'), color: overdue > 0 ? Theme.danger : Theme.success },
						{ value: upcoming, label: t('vaccinationCard.statUpcoming'), color: upcoming > 0 ? Theme.warning : colors.text.primary },
					].map((s, i) => (
						<View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
							<Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
							<Text style={[styles.statLabel, { color: colors.text.secondary }]}>{s.label}</Text>
						</View>
					))}
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
		paddingHorizontal: 8,
		paddingVertical: 12,
	},
	headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
	headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 4 },
	// Stats
	statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
	statCard: {
		flex: 1, borderRadius: 12, borderWidth: 1,
		alignItems: 'center', paddingVertical: 12, gap: 2,
	},
	statValue: { fontSize: 20, fontWeight: '700' },
	statLabel: { fontSize: 11, textAlign: 'center' },
	// Lista
	content: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
	vaccineItem: {
		borderRadius: 14,
		marginBottom: 10,
		overflow: 'hidden',
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
	vaccineItemMain: { flexDirection: 'row', alignItems: 'center', padding: 14 },
	vaccineInfo: { flex: 1 },
	vaccineName: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
	vaccineDate: { fontSize: 13, marginBottom: 3 },
	statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
	statusText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
	actionRow: {
		flexDirection: 'row', borderTopWidth: 1,
	},
	actionBtn: {
		flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
		gap: 6, paddingVertical: 10, paddingHorizontal: 8,
	},
	actionBtnText: { fontSize: 12, fontWeight: '600' },
});
