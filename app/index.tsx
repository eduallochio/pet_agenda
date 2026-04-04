import React, { useEffect } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EntryPoint() {
	const router = useRouter();

	useEffect(() => {
		const checkUserStatus = async () => {
				try {
				// Solicitar permissões e agendar reengajamento (apenas mobile)
				if (Platform.OS !== 'web') {
					try {
						const NS = await import('../services/notificationService');
						await NS.requestNotificationPermissions();
						await NS.scheduleReengagementNotification(5);
					} catch (notifError) {
						console.warn('Erro ao configurar notificações:', notifError);
					}
				}

				const [petsJSON, onboardingDone] = await Promise.all([
					AsyncStorage.getItem('pets'),
					AsyncStorage.getItem('onboardingDone'),
				]);
				const pets = petsJSON ? JSON.parse(petsJSON) : [];

				if (!onboardingDone) {
					// Primeiro acesso: mostrar onboarding
					router.replace('/onboarding');
				} else if (pets.length === 0) {
					router.replace('/(tabs)/add-pet');
				} else {
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