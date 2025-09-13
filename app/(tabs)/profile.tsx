// Arquivo: app/(tabs)/profile.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet } from '../types/pet'; // Ajuste o caminho se necessário

export default function ProfileScreen() {
	// Estado para guardar a lista de pets do usuário
	const [pets, setPets] = useState<Pet[]>([]);

	// Reutilizamos a mesma lógica do Dashboard para carregar os pets
	// sempre que a tela de perfil entrar em foco.
	useFocusEffect(
		useCallback(() => {
			const loadPets = async () => {
				try {
					const petsJSON = await AsyncStorage.getItem('pets');
					setPets(petsJSON ? JSON.parse(petsJSON) : []);
				} catch (error) {
					console.error("Erro ao carregar os pets no perfil", error);
				}
			};
			loadPets();
		}, [])
	);

	// Componente para renderizar cada pet na seção "Meus Pets"
	const PetAvatar = ({ pet }: { pet: Pet }) => (
		<Link href={`/pet/${pet.id}`} asChild>
			<TouchableOpacity style={styles.petAvatarContainer}>
				<View style={styles.petAvatar}>
					<Text>🐾</Text>
				</View>
				<Text style={styles.petName}>{pet.name}</Text>
			</TouchableOpacity>
		</Link>
	);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				{/* Seção do Perfil do Usuário */}
				<View style={styles.profileSection}>
					<View style={styles.userAvatar}>
						{/* Placeholder para a foto do usuário */}
					</View>
					<Text style={styles.userName}>Sophia</Text>
					<Text style={styles.userBio}>Pet Lover</Text>
				</View>

				{/* Seção Meus Pets */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Meus Pets</Text>
					<FlatList
						data={pets}
						renderItem={({ item }) => <PetAvatar pet={item} />}
						keyExtractor={item => item.id}
						horizontal // Deixa a lista na horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ gap: 15 }}
						ListEmptyComponent={<Text style={styles.emptyText}>Nenhum pet cadastrado.</Text>}
					/>
				</View>

				{/* Seção Amigos (Placeholder) */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Amigos</Text>
					<View style={styles.friendsContainer}>
						{/* Placeholder para avatares de amigos */}
						<View style={styles.friendAvatar} />
						<View style={styles.friendAvatar} />
						<View style={styles.friendAvatar} />
						<View style={styles.friendAvatar} />
					</View>
				</View>

				{/* Botões de Ação */}
				<View style={styles.actionsContainer}>
					<TouchableOpacity style={styles.buttonSecondary}>
						<Text style={styles.buttonSecondaryText}>Editar Perfil</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.buttonPrimary}>
						<Text style={styles.buttonPrimaryText}>Adicionar Amigos</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8F9FA' },
	scrollContainer: { paddingVertical: 20 },
	profileSection: { alignItems: 'center', marginBottom: 30 },
	userAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8E8E8', marginBottom: 15 },
	userName: { fontSize: 24, fontWeight: 'bold' },
	userBio: { fontSize: 16, color: 'gray' },
	section: { marginBottom: 30, paddingHorizontal: 20 },
	sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
	petAvatarContainer: { alignItems: 'center' },
	petAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
	petName: { marginTop: 8, fontSize: 14, fontWeight: '500' },
	emptyText: { color: 'gray' },
	friendsContainer: { flexDirection: 'row', gap: 10 },
	friendAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8E8E8' },
	actionsContainer: { paddingHorizontal: 20, marginTop: 10 },
	buttonPrimary: { backgroundColor: '#40E0D0', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
	buttonPrimaryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
	buttonSecondary: { backgroundColor: '#fff', paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10 },
	buttonSecondaryText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
});