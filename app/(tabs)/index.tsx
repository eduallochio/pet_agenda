import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pet, Reminder } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';
import Badge from '../../components/Badge';
export default function PetDashboard() {
  // Estado para guardar a lista de pets
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Função para carregar os pets do armazenamento local
  const loadPets = async () => {
    try {
      const petsJSON = await AsyncStorage.getItem('pets');
      if (petsJSON) {
        setPets(JSON.parse(petsJSON));
      } else {
        setPets([]); // Se não houver nada salvo, define a lista como vazia
      }

      const remindersJSON = await AsyncStorage.getItem('reminders');
      if (remindersJSON) {
        setReminders(JSON.parse(remindersJSON));
      } else {
        setReminders([]);
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

  // Função para contar lembretes próximos de cada pet
  const getUpcomingRemindersCount = (petId: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reminders.filter(r => {
      const reminderDate = new Date(r.date);
      reminderDate.setHours(0, 0, 0, 0);
      return r.petId === petId && reminderDate >= today;
    }).length;
  };

  // Componente para renderizar cada item da lista
  type PetItemProps = {
    pet: Pet;
    onDelete: () => void;
  };

  const PetItem = ({ pet, onDelete }: PetItemProps) => {
    const upcomingCount = getUpcomingRemindersCount(pet.id);
    return (
      // Componente Link para criar a navegação para a tela de detalhes
      <Link href={{ pathname: "/pet/[id]", params: { id: pet.id } }} asChild>
        <TouchableOpacity style={styles.petItem}>
          <View style={styles.petAvatar}>
            <Text style={styles.petAvatarEmoji}>🐾</Text>
          </View>
          <View style={styles.petInfo}>
            <Text style={styles.petName}>{pet.name}</Text>
            <Text style={styles.petSpecies}>{pet.species}</Text>
            {upcomingCount > 0 && (
              <Badge variant="info" label={`${upcomingCount} eventos`} small style={{ marginTop: 4 }} />
            )}
          </View>
          {/* Envolvemos o botão de excluir em uma View para evitar que o clique se propague para o Link */}
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Link>
    );
  };

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Pets</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{pets.length}</Text>
        </View>
      </View>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  counterBadge: { backgroundColor: Theme.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  counterText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  petItem: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 15, ...Shadows.medium },
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