import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Shadows } from '../constants/Shadows';

type Props = {
  petName: string;
  age: number;
  species: string;
  onDismiss: () => void;
};

const SPECIES_EMOJI: Record<string, string> = {
  Cachorro: '🐶', Gato: '🐱', Pássaro: '🐦',
  Coelho: '🐰', Hamster: '🐹', Peixe: '🐟',
  Réptil: '🦎', Outro: '🐾',
};

export default function BirthdayBanner({ petName, age, species, onDismiss }: Props) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const emoji = SPECIES_EMOJI[species] ?? '🐾';
  const ageText = age === 1 ? t('birthday.bannerAge1') : t('birthday.bannerAge', { count: age });

  useEffect(() => {
    // Entrada: slide de cima + scale
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Bounce do emoji após entrada
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ).start();
    });
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 250, useNativeDriver: true }),
    ]).start(onDismiss);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      {/* Faixa de confete decorativa */}
      <View style={styles.confetteRow}>
        {['🎉', '✨', '🎊', '⭐', '🎈', '✨', '🎉'].map((c, i) => (
          <Text key={i} style={styles.confettiChar}>{c}</Text>
        ))}
      </View>

      <View style={styles.content}>
        {/* Emoji animado */}
        <Animated.Text style={[styles.petEmoji, { transform: [{ scale: bounceAnim }] }]}>
          {emoji}
        </Animated.Text>

        <View style={styles.textArea}>
          <Text style={styles.title}>🎂 {t('birthday.title')}</Text>
          <Text style={styles.subtitle}>
            Hoje o <Text style={styles.petName}>{petName}</Text> faz {ageText}!
          </Text>
          <Text style={styles.hint}>{t('birthday.bannerHint')}</Text>
        </View>

        {/* Botão fechar */}
        <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FF6B9D',
    ...Shadows.medium,
  },
  confetteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  confettiChar: { fontSize: 14 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingTop: 8,
  },
  petEmoji: { fontSize: 42, marginRight: 12 },
  textArea: { flex: 1 },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: 'rgba(255,255,255,0.95)', fontSize: 14, lineHeight: 20 },
  petName: { fontWeight: '800' },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 3 },
  closeBtn: { padding: 4, alignSelf: 'flex-start' },
});
