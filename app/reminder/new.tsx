import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VaccineRecord } from '../types/pet'; // Importa nosso tipo

export default function NewVaccineScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const petId = params.petId as string;

	const [vaccineName, setVaccineName] = useState('');
	const [dateAdministered, setDateAdministered] = useState('');
	const [nextDueDate, setNextDueDate] = useState('');

	// Por enquanto, esta função apenas mostra os dados. Vamos implementá-la em breve.
	const handleSaveVaccine = async () => {
		if (!vaccineName || !dateAdministered) {
			Alert.alert("Atenção", "O nome da vacina e a data de aplicação são obrigatórios.");
			return;
		}

		const newRecord: VaccineRecord = {
			id: Date.now().toString(),
			petId,
			vaccineName,
			dateAdministered,
			nextDueDate,
		};

		console.log("Salvando novo registro de vacina:", newRecord);
		// Lógica para salvar no AsyncStorage virá aqui no próximo passo.

		Alert.alert("Sucesso", "Registro de vacina salvo!");
		router.back();
	};

	return (
		<SafeAreaView style={styles.container}>
			<Text style={styles.title}>Adicionar Vacina</Text>

			<Text style={styles.label}>Nome da Vacina</Text>
			<TextInput
				style={styles.input}
				placeholder="Ex: V10 Canina, Antirrábica"
				value={vaccineName}
				onChangeText={setVaccineName}
			/>

			<Text style={styles.label}>Data de Aplicação</Text>
			<TextInput
				style={styles.input}
				placeholder="DD/MM/AAAA"
				value={dateAdministered}
				onChangeText={setDateAdministered}
			/>

			<Text style={styles.label}>Próximo Reforço (Opcional)</Text>
			<TextInput
				style={styles.input}
				placeholder="DD/MM/AAAA"
				value={nextDueDate}
				onChangeText={setNextDueDate}
			/>

			<TouchableOpacity style={styles.saveButton} onPress={handleSaveVaccine}>
				<Text style={styles.saveButtonText}>Salvar Registro</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, backgroundColor: '#fff' },
	title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
	label: { fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#333' },
	input: { backgroundColor: '#F0F8F7', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
	saveButton: { backgroundColor: '#40E0D0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
	saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});