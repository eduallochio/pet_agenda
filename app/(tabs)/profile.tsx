import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, UserProfile, Friend } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

// Dados falsos para a lista de amigos (para fins de UI)
const mockFriends: Friend[] = [
	{ id: '201', name: 'Mariana' },
	{ id: '202', name: 'João' },
	{ id: '203', name: 'Sofia' },
	{ id: '204', name: 'Lucas' },
];

export default function ProfileScreen() {
	const [pets, setPets] = useState<Pet[]>([]);
	const [profile, setProfile] = useState<UserProfile | null>(null);

	useFocusEffect(
		useCallback(() => {
			const loadData = async () => {
				try {
					const petsJSON = await AsyncStorage.getItem('pets');
					setPets(petsJSON ? JSON.parse(petsJSON) : []);

					const profileJSON = await AsyncStorage.getItem('userProfile');
					setProfile(profileJSON ? JSON.parse(profileJSON) : null);
				} catch (error) {
					console.error("Erro ao carregar dados no perfil:", error);
				}
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

	// Componente para renderizar o avatar de cada amigo
	const FriendAvatar = ({ friend }: { friend: Friend }) => (
		<TouchableOpacity style={styles.friendAvatarContainer}>
			<View style={styles.friendAvatar} />
			<Text style={styles.friendName}>{friend.name}</Text>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.profileSection}>
					<View style={styles.userAvatar} />
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
					<FlatList
						data={mockFriends}
						renderItem={({ item }) => <FriendAvatar friend={item} />}
						keyExtractor={item => item.id}
						horizontal
						showsHorizontalScrollIndicator={false}
					/>
				</View>

				<View style={styles.actionsContainer}>
					<Link href="/profile/edit" asChild>
						<TouchableOpacity style={styles.buttonSecondary}>
							<Ionicons name="create-outline" size={20} color={Theme.text.primary} style={styles.buttonIcon} />
							<Text style={styles.buttonSecondaryText}>Editar Perfil</Text>
						</TouchableOpacity>
					</Link>
					<Link href="/friends/add" asChild>
						<TouchableOpacity style={styles.buttonPrimary}>
							<Ionicons name="person-add" size={20} color="#fff" style={styles.buttonIcon} />
							<Text style={styles.buttonPrimaryText}>Adicionar Amigos</Text>
						</TouchableOpacity>
					</Link>
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
	addButton: { backgroundColor: Theme.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
	addButtonText: { color: '#fff', fontSize: 22, lineHeight: 26 },
	petAvatarContainer: { alignItems: 'center', marginRight: 15 },
	petAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...Shadows.small },
	petName: { marginTop: 8, fontSize: 14, fontWeight: '500' },
	emptyText: { color: 'gray' },
	friendAvatarContainer: { alignItems: 'center', marginRight: 15 },
	friendAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8E8E8', ...Shadows.small },
	friendName: { fontSize: 12, marginTop: 5, color: 'gray' },
	actionsContainer: { paddingHorizontal: 20, marginTop: 10 },
	buttonIcon: { marginRight: 8 },
	buttonPrimary: { backgroundColor: Theme.primary, paddingVertical: 15, borderRadius: 12, alignItems: 'center', ...Shadows.primary, flexDirection: 'row', justifyContent: 'center' },
	buttonPrimaryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
	buttonSecondary: { backgroundColor: '#fff', paddingVertical: 15, borderRadius: 12, alignItems: 'center', ...Shadows.small, marginBottom: 10, flexDirection: 'row', justifyContent: 'center' },
	buttonSecondaryText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
});