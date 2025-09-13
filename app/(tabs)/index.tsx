import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pet } from '../types/pet';
export default function PetDashboard() {
  // Estado para guardar a lista de pets
  const [pets, setPets] = useState<Pet[]>([]);

  // Função para carregar os pets do armazenamento local
  const loadPets = async () => {
    try {
      const petsJSON = await AsyncStorage.getItem('pets');
      if (petsJSON) {
        setPets(JSON.parse(petsJSON));
      } else {
        setPets([]); // Se não houver nada salvo, define a lista como vazia
      }
    } catch (error) {
      console.error("Erro ao carregar os pets", error);
    }
  };

  // Hook que executa a função loadPets toda vez que a tela entra em foco
  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [])
  );

  // Função que remove um pet da lista e do armazenamento
  const handleDeletePet = async (petIdToDelete: string) => {
    try {
      // Cria uma nova lista com todos os pets, exceto o que será excluído
      const updatedPets = pets.filter(pet => pet.id !== petIdToDelete);

      // Salva a nova lista no AsyncStorage
      await AsyncStorage.setItem('pets', JSON.stringify(updatedPets));

      // Atualiza o estado para redesenhar a tela
      setPets(updatedPets);

      Alert.alert("Sucesso", "O pet foi removido.");
    } catch (error) {
      console.error("Erro ao excluir o pet", error);
      Alert.alert("Erro", "Não foi possível remover o pet.");
    }
  };

  // Função que mostra a caixa de diálogo para confirmar a exclusão
  const confirmDelete = (pet: Pet) => {
    Alert.alert(
      "Confirmar Exclusão",
      `Você tem certeza que deseja excluir ${pet.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", onPress: () => handleDeletePet(pet.id), style: "destructive" }
      ]
    );
  };

  // Componente para renderizar cada item da lista
  type PetItemProps = {
    pet: Pet;
    onDelete: () => void;
  };

  const PetItem = ({ pet, onDelete }: PetItemProps) => (
    // Componente Link para criar a navegação para a tela de detalhes
    <Link href={{ pathname: "/pet/[id]", params: { id: pet.id } }} asChild>
      <TouchableOpacity style={styles.petItem}>
        <View style={styles.petAvatar}>
          <Text style={styles.petAvatarEmoji}>🐾</Text>
        </View>
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petSpecies}>{pet.species}</Text>
        </View>
        {/* Envolvemos o botão de excluir em uma View para evitar que o clique se propague para o Link */}
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Link>
  );

  // Se a lista de pets estiver vazia, mostra uma mensagem amigável
  if (pets.length === 0) {
    return (
      <SafeAreaView style={styles.containerEmpty}>
        <Text style={styles.emptyText}>Você ainda não cadastrou nenhum pet.</Text>
        <Text style={styles.emptySubtext}>Vá para a aba de cadastro para adicionar seu primeiro amigo!</Text>
      </SafeAreaView>
    );
  }

  // Se houver pets, renderiza a lista
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={pets}
        renderItem={({ item }) => (
          <PetItem
            pet={item}
            onDelete={() => confirmDelete(item)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
      />
    </SafeAreaView>
  );
}

// Folha de estilos do componente
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  petItem: { backgroundColor: '#F8F8F8', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  petAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  petAvatarEmoji: { fontSize: 30 },
  petInfo: { flex: 1 },
  petName: { fontSize: 18, fontWeight: 'bold' },
  petSpecies: { fontSize: 14, color: 'gray' },
  deleteButton: { padding: 10 },
  deleteButtonText: { fontSize: 24 },
  containerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubtext: { fontSize: 16, color: 'gray', textAlign: 'center', marginTop: 8 },
});