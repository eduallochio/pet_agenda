import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

const SLIDE_ICONS: { icon: MCIName; color: string }[] = [
  { icon: 'paw',           color: '#40E0D0' },
  { icon: 'calendar-check',color: '#FF9800' },
  { icon: 'needle',        color: '#4CAF50' },
  { icon: 'cloud-sync',    color: '#2196F3' },
  { icon: 'trophy',        color: '#FF6B9D' },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const SLIDES = SLIDE_ICONS.map((s, i) => ({
    ...s,
    title: t(`onboarding.slide${i}.title`),
    description: t(`onboarding.slide${i}.description`),
  }));

  const goToSlide = (index: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setCurrentIndex(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboardingDone', '1');
    router.replace('/(tabs)/add-pet');
  };

  const slide = SLIDES[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
        <Text style={[styles.skipText, { color: colors.text.light }]}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      {/* Slide content */}
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        {/* Icon circle */}
        <View style={[styles.iconCircle, {
          backgroundColor: slide.color + '20',
          ...(Platform.OS === 'web'
            ? { boxShadow: `0 8px 32px ${slide.color}40` }
            : { shadowColor: slide.color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 }),
        }]}>
          <MaterialCommunityIcons name={slide.icon} size={80} color={slide.color} />
        </View>

        <Text style={[styles.slideTitle, { color: colors.text.primary }]}>{slide.title}</Text>
        <Text style={[styles.slideDescription, { color: colors.text.secondary }]}>{slide.description}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? slide.color : colors.border },
              i === currentIndex && styles.dotActive,
            ]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Next / Start button */}
      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: slide.color,
          ...(Platform.OS === 'web'
            ? { boxShadow: `0 4px 16px ${slide.color}60` }
            : { shadowColor: slide.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }),
        }]}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.nextBtnText}>
          {currentIndex === SLIDES.length - 1 ? t('onboarding.start') : t('onboarding.next')}
        </Text>
        {currentIndex < SLIDES.length - 1 && (
          <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>

      <Text style={[styles.stepText, { color: colors.text.light }]}>
        {t('onboarding.stepOf', { current: currentIndex + 1, total: SLIDES.length })}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  skipBtn: { position: 'absolute', top: 56, right: 24 },
  skipText: { fontSize: 15 },
  slideContent: { alignItems: 'center', width: '100%', paddingBottom: 32 },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  slideDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 32,
    marginBottom: 16,
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  stepText: { fontSize: 13 },
});
