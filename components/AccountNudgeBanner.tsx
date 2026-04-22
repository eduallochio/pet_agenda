import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { useTranslation } from 'react-i18next';

type Props = {
  onCreateAccount: () => void;
  onLogin: () => void;
  onDismiss: () => void;
};

export default function AccountNudgeBanner({ onCreateAccount, onLogin, onDismiss }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onDismiss);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: Theme.primary + '30',
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          ...(Platform.OS === 'web' ? { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' } : Shadows.medium),
        },
      ]}
    >
      {/* Linha colorida no topo */}
      <View style={[styles.topAccent, { backgroundColor: Theme.primary }]} />

      <View style={styles.content}>
        {/* Ícone + texto */}
        <View style={[styles.iconWrap, { backgroundColor: Theme.primary + '15' }]}>
          <Ionicons name="cloud-outline" size={22} color={Theme.primary} />
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('accountNudge.bannerTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {t('accountNudge.bannerSubtitle')}
          </Text>

          {/* Ações */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnCreate, { backgroundColor: Theme.primary }]}
              onPress={onCreateAccount}
              activeOpacity={0.85}
            >
              <Text style={styles.btnCreateText}>{t('accountNudge.createAccount')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onLogin} activeOpacity={0.7} style={styles.btnLogin}>
              <Text style={[styles.btnLoginText, { color: Theme.primary }]}>{t('accountNudge.alreadyHaveAccount')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fechar */}
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topAccent: {
    height: 3,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnCreate: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  btnCreateText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnLogin: {
    paddingVertical: 7,
  },
  btnLoginText: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    padding: 4,
    marginTop: -2,
  },
});
