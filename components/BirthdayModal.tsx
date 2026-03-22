import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

type Props = {
  visible: boolean;
  petName: string;
  age: number;
  species: string;
  onClose: () => void;
};

const SPECIES_EMOJI: Record<string, string> = {
  Cachorro: '🐶', Gato: '🐱', Pássaro: '🐦',
  Coelho: '🐰', Hamster: '🐹', Peixe: '🐟',
  Réptil: '🦎', Outro: '🐾',
};

// Confete simples usando Views animadas
function ConfettiPiece({ color, x, delay }: { color: string; x: number; delay: number }) {
  const y = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(y, { toValue: 350, duration: 1800, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 4, duration: 1800, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 4], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          backgroundColor: color,
          left: x,
          transform: [{ translateY: y }, { rotate: spin }],
          opacity,
        },
      ]}
    />
  );
}

const CONFETTI_COLORS = ['#FF6B9D', '#40E0D0', '#FFB800', '#4CAF50', '#9C27B0', '#2196F3', '#FF9800'];

export default function BirthdayModal({ visible, petName, age, species, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.5)).current;
  const emoji = SPECIES_EMOJI[species] ?? '🐾';

  useEffect(() => {
    if (visible) {
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(0.5);
    }
  }, [visible]);

  const confettiPieces = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    x: (i * (width / 18)) + Math.random() * 20 - 10,
    delay: i * 60,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetes */}
        {Platform.OS !== 'web' && confettiPieces.map(p => (
          <ConfettiPiece key={p.id} color={p.color} x={p.x} delay={p.delay} />
        ))}

        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surface, transform: [{ scale }] },
          ]}
        >
          {/* Ícone central */}
          <View style={styles.emojiRow}>
            <Text style={styles.emoji}>{emoji}</Text>
            <MaterialCommunityIcons name="cake-variant" size={32} color="#FF6B9D" style={styles.cake} />
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('birthday.title')}
          </Text>
          <Text style={[styles.petName, { color: '#FF6B9D' }]}>{petName}</Text>
          <Text style={[styles.age, { color: colors.text.secondary }]}>
            {age === 1 ? t('birthday.oneYear') : t('birthday.years', { count: age })} 🎉
          </Text>
          <Text style={[styles.message, { color: colors.text.secondary }]}>
            {t('birthday.hint')}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{t('birthday.celebrate')}</Text>
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
  },
  confetti: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 12,
    borderRadius: 2,
  },
  card: {
    width: width * 0.82,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  emojiRow: {
    position: 'relative',
    marginBottom: 16,
  },
  emoji: { fontSize: 64 },
  cake: { position: 'absolute', bottom: -4, right: -24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  petName: { fontSize: 26, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  age: { fontSize: 15, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  button: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
