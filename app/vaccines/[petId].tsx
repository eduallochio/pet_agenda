import { Link, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VaccinationCardScreen() {
	const { petId } = useLocalSearchParams();

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ title: "Carteirinha de Vacinação" }} />

			<View style={styles.content}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Histórico de Vacinas</Text>

					{/* LINK CORRIGIDO AQUI */}
					<Link
						href={{
							pathname: "/vaccines/[petId]",
							params: { petId: petId as string }
						}}
						asChild
					>
						<TouchableOpacity style={styles.addButton}>
							<Text style={styles.addButtonText}>+</Text>
						</TouchableOpacity>
					</Link>
				</View>

				<Text style={styles.placeholderText}>Nenhum registro de vacina encontrado.</Text>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8F9FA' },
	content: { padding: 20 },
	sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
	sectionTitle: { fontSize: 22, fontWeight: 'bold' },
	addButton: { backgroundColor: '#40E0D0', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
	addButtonText: { color: '#fff', fontSize: 24, lineHeight: 30 },
	placeholderText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 40 },
});