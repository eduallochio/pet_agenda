import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Modal, TouchableOpacity, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ACHIEVEMENTS, AchievementDef } from '../hooks/useAchievements';
import { useTranslation } from 'react-i18next';

interface AchievementUnlockModalProps {
  achievementId: string | null;
  onClose: () => void;
}

// Partícula de confete
function Particle({ color, delay, startX }: { color: string; delay: number; startX: number }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 120, duration: 900, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: startX + (Math.random() - 0.5) * 60, duration: 900, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 3, duration: 900, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const rotateInterp = rotate.interpolate({ inputRange: [0, 3], outputRange: ['0deg', '540deg'] });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate: rotateInterp }],
          left: '50%',
        },
      ]}
    />
  );
}

const PARTICLE_COLORS = ['#40E0D0', '#FFB800', '#FF6B9D', '#4CAF50', '#9C27B0', '#2196F3', '#FF9800'];
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  delay: i * 40,
  startX: (Math.random() - 0.5) * 160,
}));

export default function AchievementUnlockModal({ achievementId, onClose }: AchievementUnlockModalProps) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const ach: AchievementDef | undefined = achievementId
    ? ACHIEVEMENTS.find(a => a.id === achievementId)
    : undefined;

  useEffect(() => {
    if (!achievementId || !ach) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Animação de entrada
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(2800),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      scale.setValue(0);
      onClose();
    });
  }, [achievementId]);

  if (!achievementId || !ach) return null;

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        {/* Partículas de confete */}
        <View style={styles.particlesContainer} pointerEvents="none">
          {PARTICLES.map((p, i) => (
            <Particle key={i} {...p} />
          ))}
        </View>

        {/* Card central */}
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
        >
          {/* Badge de desbloqueio */}
          <View style={styles.unlockedBadge}>
            <MaterialCommunityIcons name="trophy" size={12} color="#FFB800" />
            <Text style={styles.unlockedBadgeText}>{t('achievement.unlocked')}</Text>
          </View>

          {/* Ícone da conquista */}
          <View style={[styles.iconCircle, { backgroundColor: ach.color + '22', borderColor: ach.color + '44' }]}>
            <MaterialCommunityIcons
              name={ach.icon as any}
              size={52}
              color={ach.color}
            />
          </View>

          {/* Nome e descrição */}
          <Text style={styles.achTitle}>{t(`achievements.items.${ach.id}.title`, ach.title)}</Text>
          <Text style={styles.achDesc}>{t(`achievements.items.${ach.id}.desc`, ach.description)}</Text>

          {/* Botão fechar */}
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: ach.color }]} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('achievement.awesome')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    top: '35%',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  card: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 20,
  },
  unlockedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFB800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  achTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  achDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  closeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
