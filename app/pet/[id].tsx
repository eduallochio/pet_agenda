import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Image } from 'react-native'; // 1. Adicione 'Image' aos imports
import { useLocalSearchParams, Stack, Link, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Pet, Reminder, UserProfile } from '../types/pet';

// 2. Crie um mapa para associar as categorias às imagens que você adicionou
const reminderImages = {
	'Saúde': require('../../assets/images/saude.png'),
	'Higiene': require('../../assets/images/higiene.png'),
	'Consulta': require('../../assets/images/consulta.png'),
	// 'Outro': require('../../assets/images/outro.png'),
};

export default function PetDetailScreen() {
	const { id } = useLocalSearchParams();
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

					const remindersJSON = await AsyncStorage.getItem('reminders');
					const allReminders: Reminder[] = remindersJSON ? JSON.parse(remindersJSON) : [];
					const petReminders = allReminders.filter(r => r.petId === id);
					setReminders(petReminders);
				} catch (error) {
					console.error("Erro ao carregar dados do pet:", error);
				} finally {
					setLoading(false);
				}
			};
			loadData();
		}, [id])
	);

	if (loading) {
		return <ActivityIndicator size="large" style={{ flex: 1 }} />;
	}

	if (!pet) {
		return (
			<SafeAreaView style={styles.container}>
				<Text style={styles.errorText}>Pet não encontrado.</Text>
			</SafeAreaView>
		);
	}

	const ReminderItem = ({ item }: { item: Reminder }) => (
		<Link href={{ pathname: '/reminder/new', params: { petId: pet.id, reminderId: item.id } }} asChild>
			<TouchableOpacity style={styles.reminderItem}>
				{/* 3. Adicione o componente Image */}
				<Image
					source={reminderImages[item.category] || reminderImages['Outro']}
					style={styles.reminderImage}
				/>
				<View style={styles.reminderTextContainer}>
					<Text style={styles.reminderDescription}>{item.description}</Text>
					<Text style={styles.reminderDate}>{item.date}</Text>
				</View>
				<Ionicons name="pencil-outline" size={20} color="#A9A9A9" />
			</TouchableOpacity>
		</Link>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ title: pet.name }} />

			<View style={styles.header}>
				<View style={styles.avatar}><Text style={styles.avatarEmoji}>🐾</Text></View>
				<Text style={styles.petName}>{pet.name}</Text>
				<Text style={styles.petInfo}>{pet.species} - {pet.breed}</Text>
				<Text style={styles.petInfo}>Nascimento: {pet.dob}</Text>
			</View>

			<View style={styles.menuContainer}>
				<Link href={`/vaccines/${pet.id}`} asChild>
					<TouchableOpacity style={styles.menuButton}>
						<Text style={styles.menuButtonText}>Ver Carteirinha de Vacinação</Text>
					</TouchableOpacity>
				</Link>
			</View>

			<View style={styles.upcomingEvents}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Próximos Eventos</Text>
					<Link href={`/reminder/new?petId=${pet.id}`} asChild>
						<TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+</Text></TouchableOpacity>
					</Link>
				</View>

				{reminders.length > 0 ? (
					<FlatList
						data={reminders}
						renderItem={ReminderItem}
						keyExtractor={item => item.id}
					/>
				) : (
					<Text style={styles.placeholderText}>Nenhum evento agendado.</Text>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8F9FA' },
	header: { backgroundColor: '#fff', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
	avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
	avatarEmoji: { fontSize: 50 },
	petName: { fontSize: 28, fontWeight: 'bold' },
	petInfo: { fontSize: 16, color: 'gray', marginTop: 4 },
	menuContainer: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
	menuButton: { backgroundColor: '#40E0D0', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
	menuButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
	upcomingEvents: { padding: 20, flex: 1 },
	sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
	sectionTitle: { fontSize: 22, fontWeight: 'bold' },
	addButton: { backgroundColor: '#40E0D0', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
	addButtonText: { color: '#fff', fontSize: 24, lineHeight: 30 },
	placeholderText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 },
	errorText: { fontSize: 18, textAlign: 'center', marginTop: 50 },
	reminderItem: {
		backgroundColor: '#fff',
		padding: 15,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#eee',
	},
	// 4. Estilos para a imagem e o texto do lembrete
	reminderImage: {
		width: 50,
		height: 50,
		borderRadius: 8,
		marginRight: 15,
	},
	reminderTextContainer: {
		flex: 1,
	},
	reminderDescription: {
		fontSize: 16,
		fontWeight: '500',
	},
	reminderDate: {
		fontSize: 14,
		color: 'gray',
		marginTop: 2,
	},
});