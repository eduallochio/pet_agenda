import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';

type NoticeType = 'info' | 'warning' | 'error' | 'success';

const CONFIG: Record<NoticeType, { icon: string; color: string; bg: string }> = {
  info:    { icon: 'information-outline', color: '#3B82F6', bg: '#3B82F620' },
  warning: { icon: 'alert-outline',       color: '#F59E0B', bg: '#F59E0B20' },
  error:   { icon: 'close-circle-outline', color: '#EF4444', bg: '#EF444420' },
  success: { icon: 'check-circle-outline', color: '#10B981', bg: '#10B98120' },
};

interface NoticeModalProps {
  visible: boolean;
  type?: NoticeType;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export default function NoticeModal({
  visible,
  type = 'warning',
  title,
  message,
  confirmLabel = 'Entendi',
  onConfirm,
}: NoticeModalProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const cfg = CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          type === 'error' ? Haptics.NotificationFeedbackType.Error :
          type === 'success' ? Haptics.NotificationFeedbackType.Success :
          Haptics.NotificationFeedbackType.Warning
        );
      }
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onConfirm}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { backgroundColor: colors.surface, transform: [{ scale }], opacity }]}
        >
          {/* Ícone */}
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={36} color={cfg.color} />
            </View>
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>

          {/* Mensagem */}
          <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>

          {/* Botão */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: cfg.color }]}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{confirmLabel}</Text>
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
  iconWrap: { marginBottom: 16 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 10,
  },
  message: {
    fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24,
  },
  btn: {
    width: '100%', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
