import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';

interface SupportModalProps {
  visible: boolean;
  loading?: boolean;
  onWatchAd: () => void;
  onClose: () => void;
}

export default function SupportModal({
  visible, loading = false, onWatchAd, onClose,
}: SupportModalProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[styles.card, { backgroundColor: colors.surface, transform: [{ scale }], opacity }]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Ícone */}
            <View style={styles.iconWrap}>
              <View style={[styles.iconCircle, { backgroundColor: Theme.primary + '20' }]}>
                <MaterialCommunityIcons name="heart" size={36} color={Theme.primary} />
              </View>
            </View>

            {/* Título */}
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Apoie o Zupet 🐾
            </Text>

            {/* Descrição */}
            <Text style={[styles.desc, { color: colors.text.secondary }]}>
              O app é gratuito e mantido por anúncios. Assistir um vídeo curto nos ajuda a continuar melhorando o Zupet para você e seu pet.
            </Text>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Botão principal: assistir */}
            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
              onPress={onWatchAd}
              disabled={loading}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name={loading ? 'loading' : 'play-circle'}
                size={20}
                color="#fff"
              />
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Carregando vídeo...' : 'Assistir vídeo e salvar'}
              </Text>
            </TouchableOpacity>

            {/* Nota de rodapé */}
            <Text style={[styles.note, { color: colors.text.secondary }]}>
              O vídeo tem no máximo 30 segundos
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10,
  },
  desc: {
    fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20,
  },
  divider: { height: 1, marginBottom: 20 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Theme.primary,
    borderRadius: 14, paddingVertical: 15, marginBottom: 10,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center', marginBottom: 14,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600' },
  note: { fontSize: 11, textAlign: 'center' },
});
