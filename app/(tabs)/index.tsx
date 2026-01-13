import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useMemo } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pet, Reminder } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';
import Badge from '../../components/Badge';
import PetAvatar from '../../components/PetAvatar';
import FadeIn from '../../components/animations/FadeIn';
import AnimatedButton from '../../components/animations/AnimatedButton';
import EmptyState from '../../components/EmptyState';
import { useRouter } from 'expo-router';
import { SkeletonCard } from '../../components/Skeleton';
import SearchBar from '../../components/SearchBar';
import FilterChips from '../../components/FilterChips';

export default function PetDashboard() {
  const router = useRouter();
  // Estado para guardar a lista de pets
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'species' | 'events'>('name');

  // Função para carregar os pets do armazenamento local
  const loadPets = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  // Filtrar e ordenar pets
  const filteredAndSortedPets = useMemo(() => {
    let filtered = [...pets];

    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pet => 
        pet.name.toLowerCase().includes(query) ||
        pet.species.toLowerCase().includes(query) ||
        pet.breed?.toLowerCase().includes(query)
      );
    }

    // Filtrar por espécie
    if (selectedSpecies.length > 0) {
      filtered = filtered.filter(pet => selectedSpecies.includes(pet.species));
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'species':
          return a.species.localeCompare(b.species);
        case 'events':
          const eventsA = getUpcomingRemindersCount(a.id);
          const eventsB = getUpcomingRemindersCount(b.id);
          return eventsB - eventsA; // Decrescente
        default:
          return 0;
      }
    });

    return filtered;
  }, [pets, searchQuery, selectedSpecies, sortBy, reminders]);

  // Obter espécies únicas dos pets
  const availableSpecies = useMemo(() => {
    const species = [...new Set(pets.map(p => p.species))];
    return species.map(s => ({ id: s, label: s }));
  }, [pets]);

  // Funções de filtro
  const toggleSpeciesFilter = (species: string) => {
    setSelectedSpecies(prev => 
      prev.includes(species) 
        ? prev.filter(s => s !== species)
        : [...prev, species]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecies([]);
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meus Pets</Text>
        </View>
        <View style={{ padding: 20 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  // Componente para renderizar cada item da lista
  type PetItemProps = {
    pet: Pet;
    onDelete: () => void;
  };

  const PetItem = ({ pet, onDelete, index }: PetItemProps & { index: number }) => {
    const upcomingCount = getUpcomingRemindersCount(pet.id);
    return (
      <FadeIn delay={index * 100}>
        <Link href={{ pathname: "/pet/[id]", params: { id: pet.id } }} asChild>
          <TouchableOpacity style={styles.petItem}>
          <PetAvatar species={pet.species} photoUri={pet.photoUri} size="medium" style={Shadows.small} />
          <View style={styles.petInfo}>
            <Text style={styles.petName}>{pet.name}</Text>
            <Text style={styles.petSpecies}>{pet.species}</Text>
            {upcomingCount > 0 && (
              <Badge variant="info" label={`${upcomingCount} eventos`} small style={{ marginTop: 4 }} />
            )}
          </View>
          {/* Envolvemos o botão de excluir em uma View para evitar que o clique se propague para o Link */}
          <AnimatedButton onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </AnimatedButton>
        </TouchableOpacity>
      </Link>
      </FadeIn>
    );
  };

  // Se a lista de pets estiver vazia, mostra uma mensagem amigável
  if (pets.length === 0) {
    return (
      <SafeAreaView style={styles.containerEmpty}>
        <EmptyState 
          icon="paw"
          title="Nenhum pet cadastrado"
          message="Que tal adicionar seu primeiro amigo? Comece criando o perfil do seu pet e acompanhe sua saúde e bem-estar."
          actionLabel="Adicionar Pet"
          onAction={() => router.push('/(tabs)/add-pet')}
        />
      </SafeAreaView>
    );
  }

  // Se houver pets, renderiza a lista
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Pets</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{filteredAndSortedPets.length}</Text>
        </View>
      </View>
      
      <View style={styles.searchAndFilterContainer}>
        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por nome, espécie ou raça..."
        />
        
        {availableSpecies.length > 0 && (
          <FilterChips 
            chips={availableSpecies}
            selectedIds={selectedSpecies}
            onToggle={toggleSpeciesFilter}
            onClearAll={clearFilters}
          />
        )}

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Ordenar:</Text>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
            onPress={() => setSortBy('name')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>Nome</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'species' && styles.sortButtonActive]}
            onPress={() => setSortBy('species')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'species' && styles.sortButtonTextActive]}>Espécie</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'events' && styles.sortButtonActive]}
            onPress={() => setSortBy('events')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'events' && styles.sortButtonTextActive]}>Eventos</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredAndSortedPets.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <EmptyState 
            icon="search"
            title="Nenhum resultado"
            message="Nenhum pet encontrado com os filtros aplicados. Tente ajustar sua busca."
            actionLabel="Limpar Filtros"
            onAction={clearFilters}
          />
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedPets}
          renderItem={({ item, index }) => (
            <PetItem
              pet={item}
              index={index}
              onDelete={() => confirmDelete(item)}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
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
  searchAndFilterContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  sortContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sortLabel: { fontSize: 14, fontWeight: '600', color: Theme.text.secondary, marginRight: 4 },
  sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Theme.card, borderWidth: 1, borderColor: Theme.border },
  sortButtonActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  sortButtonText: { fontSize: 13, fontWeight: '600', color: Theme.text.secondary },
  sortButtonTextActive: { color: '#fff' },
  petItem: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 15, ...Shadows.medium },
  petInfo: { flex: 1, marginLeft: 15 },
  petName: { fontSize: 18, fontWeight: 'bold' },
  petSpecies: { fontSize: 14, color: 'gray' },
  deleteButton: { padding: 10 },
  deleteButtonText: { fontSize: 24 },
  containerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubtext: { fontSize: 16, color: 'gray', textAlign: 'center', marginTop: 8 },
});