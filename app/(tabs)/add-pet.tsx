import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Pet } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';
import IconInput from '../../components/IconInput';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';

export default function AddPetScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

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

      // Mostra animação de sucesso
      setShowSuccess(true);

      // Aguarda animação antes de redirecionar
      setTimeout(() => {
        // Lógica de redirecionamento
        if (isFirstPet) {
          // Se for o primeiro pet, substitui a rota para o perfil
          router.replace('/(tabs)/profile');
        } else {
          // Se não for o primeiro, apenas volta para a tela anterior
          router.back();
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao salvar o pet:', error);
      Alert.alert('Erro', 'Não foi possível salvar o pet.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Adicionar Novo Pet</Text>
      <IconInput iconName="paw" placeholder="Nome *" value={name} onChangeText={setName} />
      <IconInput iconName="fish" placeholder="Espécie (ex: Cachorro, Gato)" value={species} onChangeText={setSpecies} />
      <IconInput iconName="heart" placeholder="Raça" value={breed} onChangeText={setBreed} />
      <IconInput iconName="calendar" placeholder="Data de Nascimento (DD/MM/AAAA)" value={dob} onChangeText={setDob} keyboardType="numeric" />
      <AnimatedButton style={styles.button} onPress={handleSavePet}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Salvar Pet</Text>
      </AnimatedButton>

      <SuccessAnimation 
        visible={showSuccess} 
        onAnimationEnd={() => setShowSuccess(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8F9FA', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: Theme.text.primary },
  button: { backgroundColor: Theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, ...Shadows.primary, flexDirection: 'row', justifyContent: 'center' },
  buttonIcon: { marginRight: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});