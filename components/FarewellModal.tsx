import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

interface FarewellModalProps {
  visible: boolean;
  petName: string;
  onClose: () => void;
}

const MESSAGES = [
  (name: string) => `${name} sempre vai estar no seu coração. 🐾`,
  (name: string) => `Obrigado por cuidar tão bem de ${name}. 💛`,
  (name: string) => `${name} foi removido. As memórias ficam para sempre. 🌈`,
  (name: string) => `Até sempre, ${name}. Você foi muito amado. 🐾`,
  (name: string) => `${name} deixou patas marcadas no seu coração. 💙`,
];

export default function FarewellModal({ visible, petName, onClose }: FarewellModalProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pawScale = useRef(new Animated.Value(0)).current;

  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)](petName);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      // Animação da pata com delay
      setTimeout(() => {
        Animated.spring(pawScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }).start();
      }, 200);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
      pawScale.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { backgroundColor: colors.surface, transform: [{ scale }], opacity }]}
        >
          {/* Patas animadas */}
          <Animated.View style={[styles.pawWrap, { transform: [{ scale: pawScale }] }]}>
            <View style={styles.pawCircle}>
              <Text style={styles.pawEmoji}>🐾</Text>
            </View>
          </Animated.View>

          <Text style={[styles.title, { color: colors.text.primary }]}>
            Até logo, {petName}
          </Text>

          <Text style={[styles.message, { color: colors.text.secondary }]}>
            {message}
          </Text>

          <TouchableOpacity
            style={styles.btn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="heart" size={16} color="#fff" />
            <Text style={styles.btnText}>  Sempre lembrarei</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  pawWrap: { marginBottom: 16 },
  pawCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FF6B6B20',
    justifyContent: 'center', alignItems: 'center',
  },
  pawEmoji: { fontSize: 40 },
  title: {
    fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12,
  },
  message: {
    fontSize: 15, lineHeight: 23, textAlign: 'center', marginBottom: 28,
    fontStyle: 'italic',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
