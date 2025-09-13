import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Pet } from '../types/pet';

export default function AddPetScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState('');

  const handleSavePet = async () => {
    if (name.trim() === '') {
      Alert.alert('Atenção', 'O nome do pet é obrigatório.');
      return;
    }

    const newPet: Pet = {
      id: Date.now().toString(),
      name,
      species,
      breed,
      dob,
    };

    try {
      const existingPetsJSON = await AsyncStorage.getItem('pets');
      let existingPets: Pet[] = existingPetsJSON ? JSON.parse(existingPetsJSON) : [];

      const isFirstPet = existingPets.length === 0;

      existingPets.push(newPet);
      await AsyncStorage.setItem('pets', JSON.stringify(existingPets));

      Alert.alert('Sucesso!', 'Seu pet foi salvo.');

      // Lógica de redirecionamento
      if (isFirstPet) {
        // Se for o primeiro pet, substitui a rota para o perfil
        router.replace('/(tabs)/profile');
      } else {
        // Se não for o primeiro, apenas volta para a tela anterior
        router.back();
      }

    } catch (error) {
      console.error('Erro ao salvar o pet:', error);
      Alert.alert('Erro', 'Não foi possível salvar o pet.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ... o resto do seu JSX para o formulário continua o mesmo ... */}
      <Text style={styles.title}>Adicionar Novo Pet</Text>
      <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Espécie" value={species} onChangeText={setSpecies} />
      <TextInput style={styles.input} placeholder="Raça" value={breed} onChangeText={setBreed} />
      <TextInput style={styles.input} placeholder="Data de Nascimento" value={dob} onChangeText={setDob} />
      <TouchableOpacity style={styles.button} onPress={handleSavePet}>
        <Text style={styles.buttonText}>Salvar Pet</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#F0F8F7', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#40E0D0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});