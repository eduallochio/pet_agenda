import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Shadows } from '../../constants/Shadows';

// PASSO 1: Definir o que é um "Post" para o TypeScript.
type Post = {
	id: string;
	petName: string;
	petImage: string;
	caption: string;
	timestamp: string;
	likes: number;
};

const mockPosts: Post[] = [ // Também adicionamos o tipo aqui para garantir consistência
	{
		id: '1',
		petName: 'Luna',
		petImage: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e',
		caption: 'Enjoying a sunny afternoon in the park!',
		timestamp: '2 hours ago',
		likes: 23,
	},
	{
		id: '2',
		petName: 'Max',
		petImage: 'https://images.unsplash.com/photo-15917682b4387-d4b7a13c5448',
		caption: 'Just adopted this little guy! Meet Milo.',
		timestamp: '1 day ago',
		likes: 45,
	},
	{
		id: '3',
		petName: 'Bella',
		petImage: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e',
		caption: 'My cat, Whiskers, loves to nap in the sun.',
		timestamp: '3 days ago',
		likes: 18,
	},
];

// PASSO 2: Aplicar o tipo 'Post' à propriedade do componente.
const PostCard = ({ post }: { post: Post }) => (
	<View style={styles.card}>
		<Image source={{ uri: post.petImage }} style={styles.petImage} />
		<View style={styles.cardContent}>
			<Text style={styles.petName}>{post.petName}</Text>
			<Text style={styles.caption}>{post.caption}</Text>
			<Text style={styles.timestamp}>{post.timestamp}</Text>
			<View style={styles.likeContainer}>
				<TouchableOpacity>
					<Text style={styles.likeIcon}>♡</Text>
				</TouchableOpacity>
				<Text style={styles.likeCount}>{post.likes}</Text>
			</View>
		</View>
	</View>
);

export default function CommunityFeedScreen() {
	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ title: "Comunidade", headerShown: true }} />

			<FlatList
				data={mockPosts}
				renderItem={({ item }) => <PostCard post={item} />}
				keyExtractor={item => item.id}
				contentContainerStyle={styles.listContainer}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8F9FA' },
	listContainer: { padding: 10 },
	card: {
		backgroundColor: '#fff',
		borderRadius: 15,
		marginBottom: 20,
		overflow: 'hidden',
		...Shadows.medium,
	},
	petImage: {
		width: '100%',
		height: 250,
	},
	cardContent: {
		padding: 15,
	},
	petName: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	caption: {
		fontSize: 14,
		color: '#555',
		marginTop: 5,
	},
	timestamp: {
		fontSize: 12,
		color: 'gray',
		marginTop: 10,
	},
	likeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 15,
	},
	likeIcon: {
		fontSize: 24,
		color: '#333',
		marginRight: 8,
	},
	likeCount: {
		fontSize: 14,
		fontWeight: '500',
	},
});