import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Reminder, Pet } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme, getCategoryColor } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import IconInput from '../../components/IconInput';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import DatePickerInput from '../../components/DatePickerInput';
import ValidatedInput from '../../components/ValidatedInput';
import { useFormValidation } from '../../hooks/useFormValidation';

export default function ReminderFormScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const petId = params.petId as string;
	const reminderId = params.reminderId as string | undefined;
	const isEditing = !!reminderId;

	const [category, setCategory] = useState<'Saúde' | 'Higiene' | 'Consulta' | 'Outro'>('Saúde');
	const [description, setDescription] = useState('');
	const [date, setDate] = useState<Date | null>(null);
	const [showSuccess, setShowSuccess] = useState(false);

	const { validateAll, getFieldError, hasError, touchField } = useFormValidation({
		description: { required: true, minLength: 3, maxLength: 200 },
	});

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
						// Converter string DD/MM/YYYY para Date
						const dateParts = reminderToEdit.date.split('/');
						if (dateParts.length === 3) {
							const [day, month, year] = dateParts;
							setDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
						}
					}
				} catch (e) {
					console.error("Erro ao carregar lembrete para edição", e);
				}
			};
			loadReminderData();
		}
	}, [reminderId, isEditing]);

	const handleDelete = async () => {
		Alert.alert(
			"Confirmar exclusão",
			"Tem certeza que deseja excluir este lembrete?",
			[
				{ text: "Cancelar", style: "cancel" },
				{ 
					text: "Excluir", 
					style: "destructive",
					onPress: async () => {
						try {
							const remindersJSON = await AsyncStorage.getItem('reminders');
							let allReminders: Reminder[] = remindersJSON ? JSON.parse(remindersJSON) : [];
							
							// Cancelar notificações do lembrete (apenas mobile)
							const reminderToDelete = allReminders.find(r => r.id === reminderId);
							if (reminderToDelete?.notificationIds && Platform.OS !== 'web') {
								try {
									const NotificationService = await import('../../services/notificationService');
									await NotificationService.cancelNotifications(reminderToDelete.notificationIds);
								} catch (notifError) {
									console.warn('Erro ao cancelar notificações:', notifError);
								}
							}
							
							// Remover lembrete
							allReminders = allReminders.filter(r => r.id !== reminderId);
							await AsyncStorage.setItem('reminders', JSON.stringify(allReminders));
							
							Alert.alert("Sucesso", "Lembrete excluído!");
							router.back();
						} catch (error) {
							console.error('Erro ao excluir lembrete:', error);
							Alert.alert("Erro", "Não foi possível excluir.");
						}
					}
				}
			]
		);
	};

	const handleSave = async () => {
		// Valida campos
		const isValid = validateAll({ description });
		if (!isValid) {
			Alert.alert("Atenção", "Por favor, corrija os erros antes de continuar.");
			return;
		}

		if (!date) {
			Alert.alert("Atenção", "A data é obrigatória.");
			return;
		}

		// Formata a data para DD/MM/YYYY
		const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

		try {
			const remindersJSON = await AsyncStorage.getItem('reminders');
			let allReminders: Reminder[] = remindersJSON ? JSON.parse(remindersJSON) : [];

			// Buscar nome do pet para notificação
			const petsJSON = await AsyncStorage.getItem('pets');
			const allPets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
			const pet = allPets.find(p => p.id === petId);
			const petName = pet?.name || 'Seu pet';

			let notificationIds: string[] = [];

			// Agendar notificações (apenas se data é futura e não for web)
			if (Platform.OS !== 'web' && date > new Date()) {
				try {
					const NotificationService = await import('../../services/notificationService');
					notificationIds = await NotificationService.scheduleReminderNotification(
						reminderId || Date.now().toString(),
						petName,
						description,
						date,
						category
					);
				} catch (notifError) {
					console.warn('Erro ao agendar notificações:', notifError);
				}
			}

			if (isEditing) {
				// MODO EDIÇÃO: Cancela notificações antigas e atualiza
				const oldReminder = allReminders.find(r => r.id === reminderId);
				if (oldReminder?.notificationIds && Platform.OS !== 'web') {
					try {
						const NotificationService = await import('../../services/notificationService');
						await NotificationService.cancelNotifications(oldReminder.notificationIds);
					} catch (notifError) {
						console.warn('Erro ao cancelar notificações:', notifError);
					}
				}
				allReminders = allReminders.map(r =>
					r.id === reminderId 
						? { ...r, category, description, date: formattedDate, notificationIds } 
						: r
				);
			} else {
				// MODO CRIAÇÃO: Adiciona novo item
				const newReminder: Reminder = { 
					id: Date.now().toString(), 
					petId, 
					category, 
					description, 
					date: formattedDate,
					notificationIds
				};
				allReminders.push(newReminder);
			}

			await AsyncStorage.setItem('reminders', JSON.stringify(allReminders));
			
			const successMessage = isEditing ? 'atualizado' : 'salvo';
			const notifMessage = notificationIds.length > 0 
				? ` e ${notificationIds.length} notificação(ões) agendada(s)` 
				: '';
			Alert.alert("Sucesso", `Lembrete ${successMessage}${notifMessage}!`);
			router.back();
		} catch (error) {
			console.error('Erro ao salvar lembrete:', error);
			Alert.alert("Erro", "Não foi possível salvar.");
		}
	};

	const getCategoryIcon = (cat: 'Saúde' | 'Higiene' | 'Consulta'): keyof typeof Ionicons.glyphMap => {
		switch (cat) {
			case 'Saúde': return 'medical';
			case 'Higiene': return 'water';
			case 'Consulta': return 'calendar';
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ title: isEditing ? "Editar Lembrete" : "Novo Lembrete" }} />
			<Text style={styles.label}>Categoria</Text>
			<View style={styles.categoryContainer}>
				{(['Saúde', 'Higiene', 'Consulta'] as const).map(cat => {
					const categoryColor = getCategoryColor(cat);
					const isSelected = category === cat;
					return (
						<TouchableOpacity
							key={cat}
							style={[
								styles.categoryButton,
								{ borderColor: categoryColor.main, borderWidth: 2 },
								isSelected && { backgroundColor: categoryColor.main }
							]}
							onPress={() => setCategory(cat)}
						>
							<Ionicons 
								name={getCategoryIcon(cat)} 
								size={18} 
								color={isSelected ? '#fff' : categoryColor.main} 
								style={styles.categoryIcon}
							/>
							<Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{cat}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
			<Text style={styles.label}>Descrição *</Text>
			<ValidatedInput 
				iconName="text" 
				placeholder="Ex: Vacina V10" 
				value={description} 
				onChangeText={setDescription}
				onBlur={() => touchField('description')}
				error={getFieldError('description')}
				required={true}
			/>
			<DatePickerInput 
				label="Data *"
				value={date} 
				onChange={setDate} 
				placeholder="Selecione a data do lembrete"
				minimumDate={new Date()}
			/>
			<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
				<Ionicons name="checkmark-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
				<Text style={styles.saveButtonText}>Salvar</Text>
			</TouchableOpacity>
			{isEditing && (
				<TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
					<Ionicons name="trash-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
					<Text style={styles.deleteButtonText}>Excluir Lembrete</Text>
				</TouchableOpacity>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, backgroundColor: '#F8F9FA' },
	title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
	label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: Theme.text.primary },
	categoryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
	categoryButton: { 
		paddingVertical: 10, 
		paddingHorizontal: 12, 
		borderRadius: 20, 
		backgroundColor: '#FFF', 
		...Shadows.small,
		flexDirection: 'row',
		alignItems: 'center',
	},
	categoryIcon: { marginRight: 4 },
	categorySelected: {},
	categoryText: { color: '#333', fontWeight: '600', fontSize: 13 },
	categoryTextSelected: { color: '#fff' },
	saveButton: { 
		backgroundColor: Theme.primary, 
		padding: 16, 
		borderRadius: 12, 
		alignItems: 'center', 
		marginTop: 30, 
		...Shadows.primary,
		flexDirection: 'row',
		justifyContent: 'center',
	},
	saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
	deleteButton: {
		backgroundColor: '#DC3545',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		marginTop: 10,
		...Shadows.small,
		flexDirection: 'row',
		justifyContent: 'center',
	},
	deleteButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});