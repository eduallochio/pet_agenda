import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NotificationService from '../services/notificationService';

export default function EntryPoint() {
	const router = useRouter();

	useEffect(() => {
		const checkUserStatus = async () => {
			try {
				// Solicitar permissões de notificação no primeiro uso
				await NotificationService.requestNotificationPermissions();

				const petsJSON = await AsyncStorage.getItem('pets');
				const pets = petsJSON ? JSON.parse(petsJSON) : [];

				if (pets.length === 0) {
					// Utilizador novo: não tem pets, vai para a tela de adicionar
					router.replace('/add-pet');
				} else {
					// Utilizador recorrente: já tem pets, vai para o Dashboard (primeira aba)
					router.replace('/(tabs)');
				}
			} catch (error) {
				console.error("Erro ao verificar status do usuário:", error);
				// Em caso de erro, manda para a tela de adicionar por segurança
				router.replace('/add-pet');
			}
		};

		checkUserStatus();
	}, [router]);

	// Mostra um indicador de carregamento enquanto a verificação acontece
	return (
		<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
			<ActivityIndicator size="large" />
		</View>
	);
}