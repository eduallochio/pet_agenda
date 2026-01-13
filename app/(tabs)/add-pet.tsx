import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Pet } from '../../types/pet';
import { Shadows } from '../../constants/Shadows';
import { Theme } from '../../constants/Colors';
import IconInput from '../../components/IconInput';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../components/animations/AnimatedButton';
import SuccessAnimation from '../../components/animations/SuccessAnimation';
import DatePickerInput from '../../components/DatePickerInput';

export default function AddPetScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      // Pedir permissão
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

      // Lançar picker
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
      'Adicionar Foto',
      'Escolha uma opção:',
      [
        { text: 'Câmera', onPress: () => pickImage(true) },
        { text: 'Galeria', onPress: () => pickImage(false) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleSavePet = async () => {
    if (name.trim() === '') {
      Alert.alert('Atenção', 'O nome do pet é obrigatório.');
      return;
    }

    // Formata a data para DD/MM/YYYY
    const formattedDob = dob 
      ? `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`
      : '';

    const newPet: Pet = {
      id: Date.now().toString(),
      name,
      species,
      breed,
      dob: formattedDob,
      photoUri: photoUri || undefined,
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
      
      {/* Área de foto do pet */}
      <View style={styles.photoContainer}>
        <TouchableOpacity style={styles.photoButton} onPress={showImagePickerOptions}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.petPhoto} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={40} color={Theme.text.light} />
              <Text style={styles.photoPlaceholderText}>Adicionar Foto</Text>
            </View>
          )}
        </TouchableOpacity>
        {photoUri && (
          <TouchableOpacity 
            style={styles.removePhotoButton} 
            onPress={() => setPhotoUri(null)}
          >
            <Ionicons name="close-circle" size={32} color={Theme.danger} />
          </TouchableOpacity>
        )}
      </View>

      <IconInput iconName="paw" placeholder="Nome *" value={name} onChangeText={setName} />
      <IconInput iconName="fish" placeholder="Espécie (ex: Cachorro, Gato)" value={species} onChangeText={setSpecies} />
      <IconInput iconName="heart" placeholder="Raça" value={breed} onChangeText={setBreed} />
      <DatePickerInput 
        label="Data de Nascimento"
        value={dob} 
        onChange={setDob} 
        placeholder="Selecione a data de nascimento"
        maximumDate={new Date()}
      />
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
  container: { flex: 1, padding: 20, backgroundColor: '#F8F9FA' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: Theme.text.primary },
  photoContainer: { alignItems: 'center', marginBottom: 30, position: 'relative' },
  photoButton: { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', ...Shadows.medium },
  petPhoto: { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: { fontSize: 14, color: Theme.text.light, marginTop: 8 },
  removePhotoButton: { position: 'absolute', top: 0, right: '50%', marginRight: -80, backgroundColor: '#fff', borderRadius: 16, ...Shadows.small },
  button: { backgroundColor: Theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, ...Shadows.primary, flexDirection: 'row', justifyContent: 'center' },
  buttonIcon: { marginRight: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});