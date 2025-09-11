// Arquivo: app/(tabs)/index.tsx

import React, { useState } from 'react';
import {
  Alert // Importamos o componente de Alerta para dar feedback ao usuário
  ,





  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// PASSO 1: Importar a biblioteca que acabamos de instalar
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddPetScreen() {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState('');

  // PASSO 2: Transformamos a função em 'async'
  // Operações de salvar/ler dados demoram um pouco, então elas precisam ser assíncronas.
  const handleSavePet = async () => {
    // Validação simples para não salvar pets sem nome
    if (name.trim() === '') {
      Alert.alert('Atenção', 'O nome do pet é obrigatório.');
      return;
    }

    // Criamos um objeto com os dados do novo pet
    const newPet = {
      id: Date.now().toString(), // Um ID único baseado na data/hora atual
      name: name,
      species: species,
      breed: breed,
      dob: dob,
    };

    try {
      // Tentamos buscar a lista de pets que já existe
      const existingPetsJSON = await AsyncStorage.getItem('pets');

      // Se a lista existir, a transformamos de texto para objeto. Se não, criamos uma lista vazia.
      let existingPets = existingPetsJSON ? JSON.parse(existingPetsJSON) : [];

      // Adicionamos o novo pet à lista
      existingPets.push(newPet);

      // Salvamos a lista COMPLETA de volta no AsyncStorage, convertendo-a para texto (JSON)
      await AsyncStorage.setItem('pets', JSON.stringify(existingPets));

      // Damos um feedback visual para o usuário
      Alert.alert('Sucesso!', 'Seu pet foi salvo.');

      // Limpamos os campos do formulário para o próximo cadastro
      setName('');
      setSpecies('');
      setBreed('');
      setDob('');

    } catch (error) {
      console.error('Erro ao salvar o pet:', error);
      Alert.alert('Erro', 'Não foi possível salvar o pet.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* O resto do código da interface continua igual */}
      <View style={styles.form}>
        <View style={styles.photoContainer}>
          <View style={styles.photoCircle}>
            <Text style={{ fontSize: 40 }}>🐶</Text>
          </View>
          <Text style={styles.photoText}>Add Foto do Pet</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Species"
          value={species}
          onChangeText={setSpecies}
        />
        <TextInput
          style={styles.input}
          placeholder="Breed"
          value={breed}
          onChangeText={setBreed}
        />
        <TextInput
          style={styles.input}
          placeholder="Date of Birth"
          value={dob}
          onChangeText={setDob}
        />

        <TouchableOpacity style={styles.button} onPress={handleSavePet}>
          <Text style={styles.buttonText}>Save Pet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// A folha de estilos não muda
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoText: {
    fontSize: 16,
    color: 'grey',
  },
  input: {
    backgroundColor: '#F0F8F7',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#40E0D0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});