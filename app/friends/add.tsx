import React from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Friend } from '../types/pet'; // Ajuste o caminho se necessário

// Dados falsos de utilizadores que podem ser encontrados
const mockUsers: Friend[] = [
	{ id: '101', name: 'Carlos' },
	{ id: '102', name: 'Ana' },
	{ id: '103', name: 'Pedro' },
];

const UserItem = ({ user }: { user: Friend }) => (
	<View style={styles.userItem}>
		<View style={styles.userAvatar} />
		<Text style={styles.userName}>{user.name}</Text>
		<TouchableOpacity style={styles.addButton}>
			<Text style={styles.addButtonText}>Adicionar</Text>
		</TouchableOpacity>
	</View>
);

export default function AddFriendsScreen() {
	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ title: "Adicionar Amigos" }} />
			<View style={styles.content}>
				<TextInput
					style={styles.searchInput}
					placeholder="Procurar por nome..."
				/>
				<FlatList
					data={mockUsers}
					renderItem={({ item }) => <UserItem user={item} />}
					keyExtractor={item => item.id}
				/>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	content: { padding: 20 },
	searchInput: {
		backgroundColor: '#F0F8F7',
		padding: 15,
		borderRadius: 12,
		fontSize: 16,
		marginBottom: 20,
	},
	userItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	userAvatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#E8E8E8',
		marginRight: 15,
	},
	userName: {
		flex: 1,
		fontSize: 16,
		fontWeight: '500',
	},
	addButton: {
		backgroundColor: '#40E0D0',
		paddingVertical: 8,
		paddingHorizontal: 15,
		borderRadius: 20,
	},
	addButtonText: {
		color: '#fff',
		fontWeight: 'bold',
	},
});