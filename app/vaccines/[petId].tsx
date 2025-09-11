// Arquivo: app/vaccines/[petId].tsx (Versão final com lista e link corrigido)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VaccineRecord } from '../types/pet'; // O caminho pode ser '../types' dependendo de onde o arquivo está

export default function VaccinationCardScreen() {
	const { petId } = useLocalSearchParams();
	const [vaccinations, setVaccinations] = useState<VaccineRecord[]>([]);
	const [loading, setLoading] = useState(true);

	// useFocusEffect garante que a lista seja recarregada sempre que o usuário
	// voltar para esta tela (ex: depois de adicionar uma nova vacina).
	useFocusEffect(
		useCallback(() => {
			const loadVaccinations = async () => {
				if (!petId) return;
				setLoading(true);
				try {
					// Busca todos os registros de vacina salvos
					const recordsJSON = await AsyncStorage.getItem('vaccinations');
					const allRecords: VaccineRecord[] = recordsJSON ? JSON.parse(recordsJSON) : [];

					// Filtra para manter apenas os registros do pet atual
					const petRecords = allRecords.filter(v => v.petId === petId);
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

	// Componente para renderizar cada item da lista de vacinas
	const VaccineItem = ({ item }: { item: VaccineRecord }) => (
		<View style={styles.vaccineItem}>
			<Text style={styles.vaccineName}>{item.vaccineName}</Text>
			<Text style={styles.vaccineDate}>Aplicada em: {item.dateAdministered}</Text>
			{item.nextDueDate ? (
				<Text style={styles.vaccineNextDate}>Próximo reforço: {item.nextDueDate}</Text>
			) : null}
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ title: "Carteirinha de Vacinação" }} />

			<View style={styles.content}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Histórico de Vacinas</Text>
					{/* LINK CORRIGIDO PARA A TELA DE FORMULÁRIO */}
					<Link href={{ pathname: '/vaccines/new', params: { petId: petId as string } }} asChild>
						<TouchableOpacity style={styles.addButton}>
							<Text style={styles.addButtonText}>+</Text>
						</TouchableOpacity>
					</Link>
				</View>

				{loading ? <ActivityIndicator size="small" /> : (
					vaccinations.length > 0 ? (
						<FlatList
							data={vaccinations}
							renderItem={VaccineItem}
							keyExtractor={item => item.id}
						/>
					) : (
						<Text style={styles.placeholderText}>Nenhum registro de vacina encontrado.</Text>
					)
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8F9FA' },
	content: { padding: 20, flex: 1 },
	sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
	sectionTitle: { fontSize: 22, fontWeight: 'bold' },
	addButton: { backgroundColor: '#40E0D0', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
	addButtonText: { color: '#fff', fontSize: 24, lineHeight: 30 },
	placeholderText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 40 },
	vaccineItem: {
		backgroundColor: '#fff',
		padding: 15,
		borderRadius: 10,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#eee',
	},
	vaccineName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#333',
	},
	vaccineDate: {
		fontSize: 14,
		color: 'gray',
		marginTop: 4,
	},
	vaccineNextDate: {
		fontSize: 14,
		color: '#0a7ea4',
		marginTop: 4,
		fontWeight: '500',
	},
});