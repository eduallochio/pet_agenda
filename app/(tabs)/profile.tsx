import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, UserProfile } from '../types/pet';

export default function ProfileScreen() {
	const [pets, setPets] = useState<Pet[]>([]);
	const [profile, setProfile] = useState<UserProfile | null>(null);

	useFocusEffect(
		useCallback(() => {
			const loadData = async () => {
				// Carrega os pets (lógica existente)
				const petsJSON = await AsyncStorage.getItem('pets');
				setPets(petsJSON ? JSON.parse(petsJSON) : []);

				// Carrega os dados do perfil do utilizador
				const profileJSON = await AsyncStorage.getItem('userProfile');
				setProfile(profileJSON ? JSON.parse(profileJSON) : null);
			};
			loadData();
		}, [])
	);

	const PetAvatar = ({ pet }: { pet: Pet }) => (
		<Link href={`/pet/${pet.id}`} asChild>
			<TouchableOpacity style={styles.petAvatarContainer}>
				<View style={styles.petAvatar}><Text>🐾</Text></View>
				<Text style={styles.petName}>{pet.name}</Text>
			</TouchableOpacity>
		</Link>
	);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.profileSection}>
					<View style={styles.userAvatar} />
					{/* Exibe o nome do perfil salvo, ou um placeholder se não houver */}
					<Text style={styles.userName}>{profile?.name || 'Seu Nome'}</Text>
					<Text style={styles.userBio}>{profile?.bio || 'Pet Lover'}</Text>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Meus Pets</Text>
						<Link href="/add-pet" asChild>
							<TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+</Text></TouchableOpacity>
						</Link>
					</View>
					<FlatList
						data={pets}
						renderItem={({ item }) => <PetAvatar pet={item} />}
						keyExtractor={item => item.id}
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ paddingVertical: 10 }}
						ListEmptyComponent={<Text style={styles.emptyText}>Nenhum pet cadastrado.</Text>}
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Amigos</Text>
					<View style={styles.friendsContainer}>
						<View style={styles.friendAvatar} /><View style={styles.friendAvatar} /><View style={styles.friendAvatar} /><View style={styles.friendAvatar} />
					</View>
				</View>

				<View style={styles.actionsContainer}>
					{/* BOTÃO "EDITAR PERFIL" AGORA É UM LINK FUNCIONAL */}
					<Link href="/profile/edit" asChild>
						<TouchableOpacity style={styles.buttonSecondary}>
							<Text style={styles.buttonSecondaryText}>Editar Perfil</Text>
						</TouchableOpacity>
					</Link>
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
	scrollContainer: { paddingVertical: 20, paddingBottom: 50 },
	profileSection: { alignItems: 'center', marginBottom: 30 },
	userAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8E8E8', marginBottom: 15 },
	userName: { fontSize: 24, fontWeight: 'bold' },
	userBio: { fontSize: 16, color: 'gray' },
	section: { marginBottom: 30, paddingHorizontal: 20 },
	sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
	sectionTitle: { fontSize: 20, fontWeight: 'bold' },
	addButton: { backgroundColor: '#40E0D0', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
	addButtonText: { color: '#fff', fontSize: 22, lineHeight: 26 },
	petAvatarContainer: { alignItems: 'center', marginRight: 15 },
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