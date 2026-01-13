import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, Alert, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Pet } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';
import IconInput from '../../components/IconInput';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../components/animations/AnimatedButton';
import DatePickerInput from '../../components/DatePickerInput';
import PetAvatar from '../../components/PetAvatar';

export default function EditPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPetData();
  }, [id]);

  const loadPetData = async () => {
    try {
      const petsJSON = await AsyncStorage.getItem('pets');
      if (petsJSON) {
        const pets: Pet[] = JSON.parse(petsJSON);
        const pet = pets.find(p => p.id === id);
        if (pet) {
          setName(pet.name);
          setSpecies(pet.species);
          setBreed(pet.breed || '');
          setPhotoUri(pet.photoUri || null);
          
          // Converter data DD/MM/YYYY para Date
          if (pet.dob) {
            const dateParts = pet.dob.split('/');
            if (dateParts.length === 3) {
              const [day, month, year] = dateParts;
              setDob(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados do pet:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados do pet.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      const permission = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária', 
          `Precisamos de permissão para acessar ${useCamera ? 'a câmera' : 'suas fotos'}.`
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Alterar Foto',
      'Escolha uma opção:',
      [
        { text: 'Câmera', onPress: () => pickImage(true) },
        { text: 'Galeria', onPress: () => pickImage(false) },
        { text: 'Remover Foto', onPress: () => setPhotoUri(null), style: 'destructive' },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleUpdatePet = async () => {
    if (name.trim() === '') {
      Alert.alert('Atenção', 'O nome do pet é obrigatório.');
      return;
    }

    if (!dob) {
      Alert.alert('Atenção', 'A data de nascimento é obrigatória.');
      return;
    }

    try {
      const petsJSON = await AsyncStorage.getItem('pets');
      let pets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];

      const petIndex = pets.findIndex(p => p.id === id);
      if (petIndex === -1) {
        Alert.alert('Erro', 'Pet não encontrado.');
        return;
      }

      // Formatar data para DD/MM/YYYY
      const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;

      // Atualizar pet
      pets[petIndex] = {
        ...pets[petIndex],
        name: name.trim(),
        species: species.trim(),
        breed: breed.trim(),
        dob: formattedDob,
        photoUri: photoUri,
      };

      await AsyncStorage.setItem('pets', JSON.stringify(pets));
      Alert.alert('Sucesso', 'Dados do pet atualizados!');
      router.back();
    } catch (error) {
      console.error('Erro ao atualizar pet:', error);
      Alert.alert('Erro', 'Não foi possível atualizar os dados.');
    }
  };

  const handleDeletePet = () => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir ${name}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              const petsJSON = await AsyncStorage.getItem('pets');
              let pets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
              pets = pets.filter(p => p.id !== id);
              await AsyncStorage.setItem('pets', JSON.stringify(pets));
              Alert.alert('Sucesso', 'Pet excluído com sucesso.');
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Erro ao excluir pet:', error);
              Alert.alert('Erro', 'Não foi possível excluir o pet.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Editar Pet</Text>

        {/* Foto do Pet */}
        <TouchableOpacity style={styles.photoContainer} onPress={showImagePickerOptions}>
          <PetAvatar 
            species={species} 
            photoUri={photoUri} 
            size="xlarge" 
            style={Shadows.medium}
          />
          <View style={styles.photoOverlay}>
            <Ionicons name="camera" size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Nome *</Text>
        <IconInput iconName="paw" placeholder="Ex: Rex" value={name} onChangeText={setName} />

        <Text style={styles.label}>Espécie *</Text>
        <IconInput iconName="animals" placeholder="Ex: Cachorro" value={species} onChangeText={setSpecies} />

        <Text style={styles.label}>Raça</Text>
        <IconInput iconName="ribbon" placeholder="Ex: Labrador" value={breed} onChangeText={setBreed} />

        <DatePickerInput 
          label="Data de Nascimento *"
          value={dob} 
          onChange={setDob} 
          placeholder="Selecione a data de nascimento"
          maximumDate={new Date()}
        />

        <AnimatedButton style={styles.saveButton} onPress={handleUpdatePet}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Salvar Alterações</Text>
        </AnimatedButton>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePet}>
          <Ionicons name="trash-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.deleteButtonText}>Excluir Pet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: Theme.text.primary },
  photoContainer: { alignSelf: 'center', marginBottom: 30, position: 'relative' },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Theme.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.primary,
  },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: Theme.text.primary },
  saveButton: { 
    backgroundColor: Theme.primary, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  deleteButton: {
    backgroundColor: '#DC3545',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.small,
  },
  deleteButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
