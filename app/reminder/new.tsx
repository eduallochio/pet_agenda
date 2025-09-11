import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Reminder } from '../types/pet';

export default function NewReminderScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const petId = params.petId as string;

	const [category, setCategory] = useState<'Saúde' | 'Higiene' | 'Consulta' | 'Outro'>('Saúde');
	const [description, setDescription] = useState('');
	const [date, setDate] = useState('');

	const handleSaveReminder = async () => {
		if (!description || !date) {
			Alert.alert("Atenção", "Descrição e data são obrigatórios.");
			return;
		}
		const newReminder: Reminder = {
			id: Date.now().toString(),
			petId: petId,
			category,
			description,
			date,
		};
		try {
			const existingRemindersJSON = await AsyncStorage.getItem('reminders');
			let existingReminders: Reminder[] = existingRemindersJSON ? JSON.parse(existingRemindersJSON) : [];
			existingReminders.push(newReminder);
			await AsyncStorage.setItem('reminders', JSON.stringify(existingReminders));

			Alert.alert("Sucesso", "Lembrete salvo!");
			router.back();
		} catch (error) {
			console.error("Erro ao salvar lembrete:", error);
			Alert.alert("Erro", "Não foi possível salvar o lembrete.");
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<Text style={styles.title}>Novo Lembrete</Text>
			<Text style={styles.label}>Categoria</Text>
			<View style={styles.categoryContainer}>
				{(['Saúde', 'Higiene', 'Consulta'] as const).map(cat => (
					<TouchableOpacity
						key={cat}
						style={[styles.categoryButton, category === cat && styles.categorySelected]}
						onPress={() => setCategory(cat)}
					>
						<Text style={[styles.categoryText, category === cat && styles.categoryTextSelected]}>{cat}</Text>
					</TouchableOpacity>
				))}
			</View>
			<Text style={styles.label}>Descrição</Text>
			<TextInput
				style={styles.input}
				placeholder="Ex: Vacina V10"
				value={description}
				onChangeText={setDescription}
			/>
			<Text style={styles.label}>Data</Text>
			<TextInput
				style={styles.input}
				placeholder="DD/MM/AAAA"
				value={date}
				onChangeText={setDate}
			/>
			<TouchableOpacity style={styles.saveButton} onPress={handleSaveReminder}>
				<Text style={styles.saveButtonText}>Salvar Lembrete</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, backgroundColor: '#fff' },
	title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
	label: { fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#333' },
	input: { backgroundColor: '#F0F8F7', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
	categoryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
	categoryButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#E8E8E8' },
	categorySelected: { backgroundColor: '#40E0D0' },
	categoryText: { color: '#333', fontWeight: '500' },
	categoryTextSelected: { color: '#fff' },
	saveButton: { backgroundColor: '#40E0D0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
	saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});