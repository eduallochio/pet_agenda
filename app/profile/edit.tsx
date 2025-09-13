import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfile } from '../types/pet';

export default function EditProfileScreen() {
	const router = useRouter();
	const [name, setName] = useState('');
	const [bio, setBio] = useState('');

	// Carrega os dados do perfil existentes quando a tela abre
	useEffect(() => {
		const loadProfile = async () => {
			const profileJSON = await AsyncStorage.getItem('userProfile');
			if (profileJSON) {
				const profile: UserProfile = JSON.parse(profileJSON);
				setName(profile.name);
				setBio(profile.bio);
			}
		};
		loadProfile();
	}, []);

	const handleSaveProfile = async () => {
		if (!name) {
			Alert.alert("Atenção", "O nome é obrigatório.");
			return;
		}

		const newProfile: UserProfile = { name, bio };

		try {
			await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
			Alert.alert("Sucesso", "Perfil salvo!");
			router.back(); // Volta para a tela de perfil
		} catch {
			Alert.alert("Erro", "Não foi possível salvar o perfil.");
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ title: "Editar Perfil" }} />
			<View style={styles.form}>
				<Text style={styles.label}>Nome</Text>
				<TextInput
					style={styles.input}
					placeholder="Como você se chama?"
					value={name}
					onChangeText={setName}
				/>

				<Text style={styles.label}>Bio</Text>
				<TextInput
					style={styles.input}
					placeholder="Fale um pouco sobre você"
					value={bio}
					onChangeText={setBio}
					multiline
				/>

				<TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
					<Text style={styles.saveButtonText}>Salvar Perfil</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	form: { padding: 20 },
	label: { fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#333' },
	input: { backgroundColor: '#F0F8F7', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
	saveButton: { backgroundColor: '#40E0D0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
	saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});