import React, { useState, useCallback } from 'react';
import {
	View, Text, StyleSheet, ScrollView, TouchableOpacity,
	Platform, Share, Alert,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pet, Reminder, VaccineRecord } from '../types/pet';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { useTranslation } from 'react-i18next';

type PetReport = {
	pet: Pet;
	remindersThisMonth: Reminder[];
	upcomingReminders: Reminder[];
	vaccinesThisMonth: VaccineRecord[];
	hasBirthdayThisMonth: boolean;
	birthdayDay: number;
	age: number;
};

function parseDMY(str: string): Date | null {
	const parts = str.split('/');
	if (parts.length !== 3) return null;
	const d = parseInt(parts[0]);
	const m = parseInt(parts[1]) - 1;
	const y = parseInt(parts[2]);
	if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
	return new Date(y, m, d);
}

function calcAge(dob: string, year: number): number {
	const birth = parseDMY(dob);
	if (!birth) return 0;
	return year - birth.getFullYear();
}

export default function MonthlyReportScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const { t } = useTranslation();
	const MONTH_NAMES = t('months', { returnObjects: true, defaultValue: [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
	] }) as string[];
	const today = new Date();
	const [month, setMonth] = useState(today.getMonth());
	const [year, setYear] = useState(today.getFullYear());
	const [reports, setReports] = useState<PetReport[]>([]);
	const [totalReminders, setTotalReminders] = useState(0);
	const [totalVaccines, setTotalVaccines] = useState(0);

	const loadData = useCallback(async () => {
		const [petsJSON, remindersJSON, vaccinesJSON] = await Promise.all([
			AsyncStorage.getItem('pets'),
			AsyncStorage.getItem('reminders'),
			AsyncStorage.getItem('vaccinations'),
		]);
		const pets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
		const allReminders: Reminder[] = remindersJSON ? JSON.parse(remindersJSON) : [];
		const allVaccines: VaccineRecord[] = vaccinesJSON ? JSON.parse(vaccinesJSON) : [];

		let totalR = 0;
		let totalV = 0;

		const built: PetReport[] = pets.map(pet => {
			const remindersThisMonth = allReminders.filter(r => {
				if (r.petId !== pet.id) return false;
				const d = parseDMY(r.date);
				return d && d.getMonth() === month && d.getFullYear() === year;
			});

			// upcoming = reminders for this pet in next 30 days from today (only when viewing current month)
			const upcoming = allReminders.filter(r => {
				if (r.petId !== pet.id) return false;
				const d = parseDMY(r.date);
				if (!d) return false;
				const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
				return diff >= 0 && diff <= 30;
			});

			const vaccinesThisMonth = allVaccines.filter(v => {
				if (v.petId !== pet.id) return false;
				const d = parseDMY(v.dateAdministered);
				return d && d.getMonth() === month && d.getFullYear() === year;
			});

			let hasBirthdayThisMonth = false;
			let birthdayDay = 0;
			let age = 0;
			if (pet.dob) {
				const birth = parseDMY(pet.dob);
				if (birth && birth.getMonth() === month) {
					hasBirthdayThisMonth = true;
					birthdayDay = birth.getDate();
					age = calcAge(pet.dob, year);
				}
			}

			totalR += remindersThisMonth.length;
			totalV += vaccinesThisMonth.length;

			return {
				pet,
				remindersThisMonth,
				upcomingReminders: upcoming,
				vaccinesThisMonth,
				hasBirthdayThisMonth,
				birthdayDay,
				age,
			};
		});

		setReports(built);
		setTotalReminders(totalR);
		setTotalVaccines(totalV);
	}, [month, year]);

	useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

	const prevMonth = () => {
		if (month === 0) { setMonth(11); setYear(y => y - 1); }
		else setMonth(m => m - 1);
	};

	const nextMonth = () => {
		if (month === 11) { setMonth(0); setYear(y => y + 1); }
		else setMonth(m => m + 1);
	};

	const shareReport = async () => {
		const lines: string[] = [];
		lines.push(t('monthlyReport.shareTitle', { month: MONTH_NAMES[month], year }));
		lines.push('');
		lines.push(t('monthlyReport.shareReminders', { count: totalReminders }));
		lines.push(t('monthlyReport.shareVaccines', { count: totalVaccines }));
		lines.push('');

		for (const r of reports) {
			lines.push(`🐾 ${r.pet.name}`);
			if (r.hasBirthdayThisMonth) lines.push(`  ${t('monthlyReport.shareBirthday', { day: r.birthdayDay, age: r.age })}`);
			if (r.remindersThisMonth.length > 0) {
				lines.push(`  ${t('monthlyReport.shareRemindersSection', { count: r.remindersThisMonth.length })}`);
				r.remindersThisMonth.forEach(rem => lines.push(`    • ${rem.description} — ${rem.date}`));
			}
			if (r.vaccinesThisMonth.length > 0) {
				lines.push(`  ${t('monthlyReport.shareVaccinesSection', { count: r.vaccinesThisMonth.length })}`);
				r.vaccinesThisMonth.forEach(v => lines.push(`    • ${v.vaccineName} — ${v.dateAdministered}`));
			}
			lines.push('');
		}

		lines.push(t('monthlyReport.shareFooter'));

		try {
			await Share.share({ message: lines.join('\n') });
		} catch {
			Alert.alert(t('common.error'), t('monthlyReport.shareError'));
		}
	};

	const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
	const hasAnyData = totalReminders > 0 || totalVaccines > 0 || reports.some(r => r.hasBirthdayThisMonth);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header */}
			<View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				<TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={colors.text.primary} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('monthlyReport.title')}</Text>
				<TouchableOpacity style={styles.headerBtn} onPress={shareReport}>
					<Ionicons name="share-social-outline" size={24} color={Theme.primary} />
				</TouchableOpacity>
			</View>

			{/* Month navigator */}
			<View style={[styles.monthNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				<TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
					<Ionicons name="chevron-back" size={22} color={colors.text.primary} />
				</TouchableOpacity>
				<Text style={[styles.monthLabel, { color: colors.text.primary }]}>
					{MONTH_NAMES[month]} {year}
					{isCurrentMonth && <Text style={styles.currentBadge}> • {t('monthlyReport.current')}</Text>}
				</Text>
				<TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
					<Ionicons name="chevron-forward" size={22} color={colors.text.primary} />
				</TouchableOpacity>
			</View>

			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* Summary cards */}
				<View style={styles.summaryRow}>
					<View style={[styles.summaryCard, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : Shadows.small) }]}>
						<Ionicons name="calendar-outline" size={24} color={Theme.primary} />
						<Text style={[styles.summaryNumber, { color: colors.text.primary }]}>{totalReminders}</Text>
						<Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>{t('monthlyReport.reminders')}</Text>
					</View>
					<View style={[styles.summaryCard, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : Shadows.small) }]}>
						<MaterialCommunityIcons name="needle" size={24} color="#4CAF50" />
						<Text style={[styles.summaryNumber, { color: colors.text.primary }]}>{totalVaccines}</Text>
						<Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>{t('monthlyReport.vaccines')}</Text>
					</View>
					<View style={[styles.summaryCard, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : Shadows.small) }]}>
						<MaterialCommunityIcons name="cake-variant-outline" size={24} color="#E91E63" />
						<Text style={[styles.summaryNumber, { color: colors.text.primary }]}>
							{reports.filter(r => r.hasBirthdayThisMonth).length}
						</Text>
						<Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>{t('monthlyReport.birthdays')}</Text>
					</View>
				</View>

				{/* Per-pet reports */}
				{reports.length === 0 ? (
					<View style={styles.emptyContainer}>
						<View style={[styles.emptyIconCircle, { backgroundColor: Theme.primary + '15' }]}>
						<MaterialCommunityIcons name="paw-outline" size={52} color={Theme.primary} />
					</View>
						<Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('monthlyReport.noPets')}</Text>
						<Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>
							{t('monthlyReport.noPetsMsg')}
						</Text>
					</View>
				) : !hasAnyData ? (
					<View style={styles.emptyContainer}>
						<View style={[styles.emptyIconCircle, { backgroundColor: Theme.primary + '15' }]}>
						<Ionicons name="calendar-outline" size={52} color={Theme.primary} />
					</View>
						<Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('monthlyReport.quietMonth')}</Text>
						<Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>
							{t('monthlyReport.quietMonthMsg', { month: MONTH_NAMES[month] })}
						</Text>
					</View>
				) : (
					reports.map(r => (
						<PetReportCard key={r.pet.id} report={r} colors={colors} isCurrentMonth={isCurrentMonth} />
					))
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function PetReportCard({ report, colors, isCurrentMonth }: { report: PetReport; colors: any; isCurrentMonth: boolean }) {
	const { t } = useTranslation();
	const { pet, remindersThisMonth, upcomingReminders, vaccinesThisMonth, hasBirthdayThisMonth, birthdayDay, age } = report;
	const hasContent = remindersThisMonth.length > 0 || vaccinesThisMonth.length > 0 || hasBirthdayThisMonth;
	if (!hasContent) return null;

	const ageText = age === 1
		? t('monthlyReport.ageOne')
		: t('monthlyReport.ageMany', { count: age });

	return (
		<View style={[styles.petCard, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : Shadows.small) }]}>
			{/* Pet header */}
			<View style={styles.petCardHeader}>
				<Text style={styles.petEmoji}>🐾</Text>
				<View style={{ flex: 1 }}>
					<Text style={[styles.petName, { color: colors.text.primary }]}>{pet.name}</Text>
					{!!(pet.species || pet.breed) && (
						<Text style={[styles.petMeta, { color: colors.text.secondary }]}>
							{[pet.species, pet.breed].filter(Boolean).join(' · ')}
						</Text>
					)}
				</View>
			</View>

			{/* Birthday */}
			{hasBirthdayThisMonth && (
				<View style={styles.birthdayRow}>
					<Text style={styles.birthdayText}>
						{t('monthlyReport.birthdayText', { day: birthdayDay, age: ageText })}
					</Text>
				</View>
			)}

			{/* Reminders this month */}
			{remindersThisMonth.length > 0 && (
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
						{t('monthlyReport.remindersSection', { count: remindersThisMonth.length })}
					</Text>
					{remindersThisMonth.map(rem => (
						<View key={rem.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
							<Ionicons name="calendar-outline" size={16} color={Theme.primary} style={{ marginRight: 8 }} />
							<Text style={[styles.itemText, { color: colors.text.primary }]} numberOfLines={1}>
								{rem.description}
							</Text>
							<Text style={[styles.itemDate, { color: colors.text.secondary }]}>{rem.date}</Text>
						</View>
					))}
				</View>
			)}

			{/* Vaccines this month */}
			{vaccinesThisMonth.length > 0 && (
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
						{t('monthlyReport.vaccinesSection', { count: vaccinesThisMonth.length })}
					</Text>
					{vaccinesThisMonth.map(v => (
						<View key={v.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
							<MaterialCommunityIcons name="needle" size={16} color="#4CAF50" style={{ marginRight: 8 }} />
							<Text style={[styles.itemText, { color: colors.text.primary }]} numberOfLines={1}>
								{v.vaccineName}
							</Text>
							<Text style={[styles.itemDate, { color: colors.text.secondary }]}>{v.dateAdministered}</Text>
						</View>
					))}
				</View>
			)}

			{/* Upcoming reminders (only in current month view) */}
			{isCurrentMonth && upcomingReminders.length > 0 && (
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: '#FF9800' }]}>
						{t('monthlyReport.upcomingSection', { count: upcomingReminders.length })}
					</Text>
					{upcomingReminders.slice(0, 3).map(rem => (
						<View key={rem.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
							<Ionicons name="time-outline" size={16} color="#FF9800" style={{ marginRight: 8 }} />
							<Text style={[styles.itemText, { color: colors.text.primary }]} numberOfLines={1}>
								{rem.description}
							</Text>
							<Text style={[styles.itemDate, { color: colors.text.secondary }]}>{rem.date}</Text>
						</View>
					))}
					{upcomingReminders.length > 3 && (
						<Text style={[styles.moreText, { color: colors.text.light }]}>
							{t('monthlyReport.moreItems', { count: upcomingReminders.length - 3 })}
						</Text>
					)}
				</View>
			)}
		</View>
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
	headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
	// Month navigator
	monthNav: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 8,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	navBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
	monthLabel: { fontSize: 18, fontWeight: '700' },
	currentBadge: { fontSize: 13, color: Theme.primary, fontWeight: '600' },
	// Scroll
	scroll: { padding: 16, paddingBottom: 40 },
	// Summary row
	summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
	summaryCard: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 16,
		borderRadius: 14,
	},
	summaryNumber: { fontSize: 22, fontWeight: '800', marginTop: 4 },
	summaryLabel: { fontSize: 12, marginTop: 2 },
	// Empty
	emptyContainer: { alignItems: 'center', paddingVertical: 60 },
	emptyIconCircle: {
		width: 110,
		height: 110,
		borderRadius: 55,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20,
	},
	emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
	emptyMessage: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
	// Pet card
	petCard: {
		borderRadius: 16,
		marginBottom: 16,
		overflow: 'hidden',
	},
	petCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		paddingBottom: 12,
	},
	petEmoji: { fontSize: 28, marginRight: 12 },
	petName: { fontSize: 17, fontWeight: '700' },
	petMeta: { fontSize: 13, marginTop: 2 },
	// Birthday
	birthdayRow: {
		backgroundColor: '#FF6B9D18',
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginHorizontal: 12,
		borderRadius: 10,
		marginBottom: 8,
	},
	birthdayText: { fontSize: 14, color: '#FF6B9D', fontWeight: '600' },
	// Sections
	section: { paddingHorizontal: 16, paddingBottom: 12 },
	sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	itemText: { flex: 1, fontSize: 14 },
	itemDate: { fontSize: 12, marginLeft: 8 },
	moreText: { fontSize: 12, textAlign: 'center', paddingTop: 4 },
});
