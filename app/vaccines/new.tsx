import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VaccineRecord, Pet } from '../../types/pet';
import { Theme } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import IconInput from '../../components/IconInput';
import DatePickerInput from '../../components/DatePickerInput';
import AnimatedButton from '../../components/animations/AnimatedButton';
import { Ionicons } from '@expo/vector-icons';
import * as NotificationService from '../../services/notificationService';

export default function NewVaccineScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const petId = params.petId as string;
	const vaccineId = params.vaccineId as string | undefined;
	const isEditing = !!vaccineId;

	const [vaccineName, setVaccineName] = useState('');
	const [dateAdministered, setDateAdministered] = useState<Date | null>(null);
	const [nextDueDate, setNextDueDate] = useState<Date | null>(null);

	// Carregar dados ao editar
	useEffect(() => {
		if (isEditing) {
			const loadVaccineData = async () => {
				try {
					const recordsJSON = await AsyncStorage.getItem('vaccinations');
					const allRecords: VaccineRecord[] = recordsJSON ? JSON.parse(recordsJSON) : [];
					const recordToEdit = allRecords.find(v => v.id === vaccineId);

					if (recordToEdit) {
						setVaccineName(recordToEdit.vaccineName);
						// Converter strings para Date
						const adminParts = recordToEdit.dateAdministered.split('/');
						if (adminParts.length === 3) {
							const [day, month, year] = adminParts;
							setDateAdministered(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
						}
						if (recordToEdit.nextDueDate) {
							const dueParts = recordToEdit.nextDueDate.split('/');
							if (dueParts.length === 3) {
								const [day, month, year] = dueParts;
								setNextDueDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
							}
						}
					}
				} catch (error) {
					console.error("Erro ao carregar vacina para edição:", error);
				}
			};
			loadVaccineData();
		}
	}, [vaccineId, isEditing]);
	const handleDeleteVaccine = async () => {
		Alert.alert(
			"Confirmar exclusão",
			"Tem certeza que deseja excluir este registro de vacina?",
			[
				{ text: "Cancelar", style: "cancel" },
				{ 
					text: "Excluir", 
					style: "destructive",
					onPress: async () => {
						try {
							const vaccinationsJSON = await AsyncStorage.getItem('vaccinations');
							let existingRecords: VaccineRecord[] = vaccinationsJSON ? JSON.parse(vaccinationsJSON) : [];
							
							// Cancelar notificações da vacina
							const vaccineToDelete = existingRecords.find(v => v.id === vaccineId);
							if (vaccineToDelete?.notificationIds) {
								await NotificationService.cancelNotifications(vaccineToDelete.notificationIds);
							}
							
							// Remover registro
							existingRecords = existingRecords.filter(v => v.id !== vaccineId);
							await AsyncStorage.setItem('vaccinations', JSON.stringify(existingRecords));
							
							Alert.alert("Sucesso", "Registro de vacina excluído!");
							router.back();
						} catch (error) {
							console.error('Erro ao excluir vacina:', error);
							Alert.alert("Erro", "Não foi possível excluir.");
						}
					}
				}
			]
		);
	};
	const handleSaveVaccine = async () => {
		if (!vaccineName || !dateAdministered) {
			Alert.alert("Atenção", "O nome da vacina e a data de aplicação são obrigatórios.");
			return;
		}

		// Formatar datas para DD/MM/YYYY
		const formatDate = (date: Date) => 
			`${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

		const formattedAdmin = formatDate(dateAdministered);
		const formattedNextDue = nextDueDate ? formatDate(nextDueDate) : undefined;

		try {
			const existingRecordsJSON = await AsyncStorage.getItem('vaccinations');
			let existingRecords: VaccineRecord[] = existingRecordsJSON ? JSON.parse(existingRecordsJSON) : [];

			// Buscar nome do pet para notificação
			const petsJSON = await AsyncStorage.getItem('pets');
			const allPets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
			const pet = allPets.find(p => p.id === petId);
			const petName = pet?.name || 'Seu pet';

			let notificationIds: string[] = [];

			// Agendar notificações APENAS se houver data de reforço e for futura
			if (nextDueDate && nextDueDate > new Date()) {
				notificationIds = await NotificationService.scheduleVaccineNotification(
					vaccineId || Date.now().toString(),
					petName,
					vaccineName,
					nextDueDate
				);
			}

			if (isEditing) {
				// MODO EDIÇÃO: Cancela notificações antigas e atualiza
				const oldRecord = existingRecords.find(v => v.id === vaccineId);
				if (oldRecord?.notificationIds) {
					await NotificationService.cancelNotifications(oldRecord.notificationIds);
				}
				existingRecords = existingRecords.map(v =>
					v.id === vaccineId
						? { ...v, vaccineName, dateAdministered: formattedAdmin, nextDueDate: formattedNextDue, notificationIds }
						: v
				);
			} else {
				// MODO CRIAÇÃO: Adiciona novo registro
				const newRecord: VaccineRecord = {
					id: Date.now().toString(),
					petId,
					vaccineName,
					dateAdministered: formattedAdmin,
					nextDueDate: formattedNextDue,
					notificationIds,
				};
				existingRecords.push(newRecord);
			}

			await AsyncStorage.setItem('vaccinations', JSON.stringify(existingRecords));

			const successMessage = isEditing ? 'atualizado' : 'salvo';
			const notifMessage = notificationIds.length > 0 
				? ` e ${notificationIds.length} notificação(ões) agendada(s) para o reforço` 
				: '';
			Alert.alert("Sucesso", `Registro de vacina ${successMessage}${notifMessage}!`);
			router.back();
		} catch (error) {
			console.error("Erro ao salvar o registro da vacina:", error);
			Alert.alert("Erro", "Não foi possível salvar o registro.");
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<Text style={styles.title}>{isEditing ? 'Editar Vacina' : 'Adicionar Vacina'}</Text>
			
			<IconInput 
				iconName="medical" 
				placeholder="Ex: V10 Canina, Antirrábica" 
				value={vaccineName} 
				onChangeText={setVaccineName} 
			/>
			
			<DatePickerInput 
				label="Data de Aplicação *"
				value={dateAdministered} 
				onChange={setDateAdministered} 
				placeholder="Selecione a data de aplicação"
				maximumDate={new Date()}
			/>
			
			<DatePickerInput 
				label="Próximo Reforço (Opcional)"
				value={nextDueDate} 
				onChange={setNextDueDate} 
				placeholder="Selecione a data do reforço"
				minimumDate={dateAdministered || new Date()}
			/>
			
			<AnimatedButton style={styles.saveButton} onPress={handleSaveVaccine}>
				<Ionicons name="checkmark-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
				<Text style={styles.saveButtonText}>{isEditing ? 'Atualizar' : 'Salvar'} Registro</Text>
			</AnimatedButton>
			{isEditing && (
				<TouchableOpacity style={styles.deleteButton} onPress={handleDeleteVaccine}>
					<Ionicons name="trash-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
					<Text style={styles.deleteButtonText}>Excluir Registro</Text>
				</TouchableOpacity>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, backgroundColor: Theme.background },
	title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: Theme.text.primary },
	saveButton: { 
		backgroundColor: Theme.primary, 
		padding: 16, 
		borderRadius: 12, 
		alignItems: 'center', 
		marginTop: 30,
		flexDirection: 'row',
		justifyContent: 'center',
		...Shadows.primary,
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