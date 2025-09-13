import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Reminder } from '../types/pet';

export default function ReminderFormScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const petId = params.petId as string;
	const reminderId = params.reminderId as string | undefined;
	const isEditing = !!reminderId;

	const [category, setCategory] = useState<'Saúde' | 'Higiene' | 'Consulta' | 'Outro'>('Saúde');
	const [description, setDescription] = useState('');
	const [date, setDate] = useState('');

	// EFEITO PARA CARREGAR OS DADOS QUANDO A TELA ABRE EM MODO DE EDIÇÃO
	useEffect(() => {
		if (isEditing) {
			const loadReminderData = async () => {
				try {
					const remindersJSON = await AsyncStorage.getItem('reminders');
					const allReminders: Reminder[] = remindersJSON ? JSON.parse(remindersJSON) : [];
					const reminderToEdit = allReminders.find(r => r.id === reminderId);

					if (reminderToEdit) {
						setCategory(reminderToEdit.category);
						setDescription(reminderToEdit.description);
						setDate(reminderToEdit.date);
					}
				} catch (e) {
					console.error("Erro ao carregar lembrete para edição", e);
				}
			};
			loadReminderData();
		}
	}, [reminderId, isEditing]);

	const handleSave = async () => {
		if (!description || !date) {
			Alert.alert("Atenção", "Descrição e data são obrigatórios.");
			return;
		}

		try {
			const remindersJSON = await AsyncStorage.getItem('reminders');
			let allReminders: Reminder[] = remindersJSON ? JSON.parse(remindersJSON) : [];

			if (isEditing) {
				// MODO EDIÇÃO: Atualiza o item na lista
				allReminders = allReminders.map(r =>
					r.id === reminderId ? { ...r, category, description, date } : r
				);
			} else {
				// MODO CRIAÇÃO: Adiciona novo item
				const newReminder: Reminder = { id: Date.now().toString(), petId, category, description, date };
				allReminders.push(newReminder);
			}

			await AsyncStorage.setItem('reminders', JSON.stringify(allReminders));
			Alert.alert("Sucesso", `Lembrete ${isEditing ? 'atualizado' : 'salvo'}!`);
			router.back();
		} catch {
			Alert.alert("Erro", "Não foi possível salvar.");
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ title: isEditing ? "Editar Lembrete" : "Novo Lembrete" }} />
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
			<TextInput style={styles.input} placeholder="Ex: Vacina V10" value={description} onChangeText={setDescription} />
			<Text style={styles.label}>Data</Text>
			<TextInput style={styles.input} placeholder="DD/MM/AAAA" value={date} onChangeText={setDate} keyboardType="numeric" />
			<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
				<Text style={styles.saveButtonText}>Salvar</Text>
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