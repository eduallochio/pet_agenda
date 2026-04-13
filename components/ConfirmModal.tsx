import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

type ConfirmType = 'danger' | 'warning' | 'info';

const CONFIG: Record<ConfirmType, { icon: string; color: string; bg: string; confirmBg: string }> = {
  danger:  { icon: 'trash-can-outline',  color: '#EF4444', bg: '#EF444420', confirmBg: '#EF4444' },
  warning: { icon: 'alert-outline',      color: '#F59E0B', bg: '#F59E0B20', confirmBg: '#F59E0B' },
  info:    { icon: 'information-outline', color: '#3B82F6', bg: '#3B82F620', confirmBg: '#3B82F6' },
};

interface ConfirmModalProps {
  visible: boolean;
  type?: ConfirmType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  type = 'danger',
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
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
          type === 'danger' ? Haptics.NotificationFeedbackType.Warning :
          Haptics.NotificationFeedbackType.Warning
        );
      }
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { backgroundColor: colors.surface, transform: [{ scale }], opacity }]}
        >
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={36} color={cfg.color} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btnCancel, { borderColor: colors.border }]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnCancelText, { color: colors.text.secondary }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnConfirm, { backgroundColor: cfg.confirmBg }]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.btnConfirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
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
  iconWrap:   { marginBottom: 16 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  message: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24, color: '#666' },
  btnRow:  { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancel: {
    flex: 1, borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  btnCancelText:  { fontSize: 15, fontWeight: '600' },
  btnConfirm: {
    flex: 1, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  btnConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
