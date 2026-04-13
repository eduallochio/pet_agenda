import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

export type DeleteReason =
  | 'wrong_data'
  | 'passed_away'
  | 'rehomed'
  | 'duplicate'
  | 'other';

interface DeleteReasonModalProps {
  visible: boolean;
  petName: string;
  onConfirmDelete: (reason: DeleteReason) => void;
  onMemorial: () => void; // pet faleceu mas quer manter como recordação
  onClose: () => void;
}

const REASONS: { key: DeleteReason; label: string; icon: string; color: string }[] = [
  { key: 'wrong_data',  label: 'Cadastro errado',         icon: 'pencil-off-outline',   color: '#FF9800' },
  { key: 'passed_away', label: 'Meu pet faleceu 🌈',      icon: 'heart-broken',          color: '#9C27B0' },
  { key: 'rehomed',     label: 'Doei / encontrei novo lar', icon: 'home-heart',           color: '#2196F3' },
  { key: 'duplicate',   label: 'Cadastro duplicado',       icon: 'content-copy',         color: '#607D8B' },
  { key: 'other',       label: 'Outro motivo',             icon: 'dots-horizontal-circle-outline', color: '#9E9E9E' },
];

// ── Passo 1: escolha do motivo ────────────────────────────────────────────────
function ReasonStep({
  petName,
  selected,
  onSelect,
  onConfirm,
  onClose,
  colors,
}: {
  petName: string;
  selected: DeleteReason | null;
  onSelect: (r: DeleteReason) => void;
  onConfirm: () => void;
  onClose: () => void;
  colors: any;
}) {
  return (
    <>
      <View style={styles.iconWrap}>
        <View style={[styles.iconCircle, { backgroundColor: '#FF6B6B20' }]}>
          <Ionicons name="trash-outline" size={32} color="#FF6B6B" />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text.primary }]}>
        Por que remover {petName}?
      </Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        Nos ajuda a melhorar o app 💛
      </Text>

      <View style={styles.reasons}>
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[
              styles.reasonRow,
              { borderColor: selected === r.key ? r.color : colors.border },
              selected === r.key && { backgroundColor: r.color + '12' },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              onSelect(r.key);
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.reasonIcon, { backgroundColor: r.color + '20' }]}>
              <MaterialCommunityIcons name={r.icon as any} size={20} color={r.color} />
            </View>
            <Text style={[styles.reasonLabel, { color: colors.text.primary }]}>{r.label}</Text>
            {selected === r.key && (
              <Ionicons name="checkmark-circle" size={20} color={r.color} style={{ marginLeft: 'auto' }} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.border }]} onPress={onClose} activeOpacity={0.8}>
          <Text style={[styles.btnOutlineText, { color: colors.text.secondary }]}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnDanger, !selected && styles.btnDisabled]}
          onPress={onConfirm}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.btnDangerText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Passo 2: conforto + pergunta (só para passed_away) ────────────────────────
function PassedAwayStep({
  petName,
  onMemorial,
  onDelete,
  colors,
}: {
  petName: string;
  onMemorial: () => void;
  onDelete: () => void;
  colors: any;
}) {
  return (
    <>
      <View style={styles.iconWrap}>
        <View style={[styles.iconCircle, { backgroundColor: '#9C27B020' }]}>
          <Text style={{ fontSize: 36 }}>🌈</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text.primary }]}>
        Sentimos muito, {petName} sempre viverá em seu coração.
      </Text>

      <Text style={[styles.comfortText, { color: colors.text.secondary }]}>
        Os laços que formamos com nossos pets são eternos. O amor que vocês compartilharam nunca desaparece.
      </Text>

      <View style={[styles.memorialBox, { backgroundColor: '#9C27B010', borderColor: '#9C27B040' }]}>
        <MaterialCommunityIcons name="candle" size={22} color="#9C27B0" style={{ marginBottom: 6 }} />
        <Text style={[styles.memorialQuestion, { color: colors.text.primary }]}>
          Deseja manter o perfil de {petName} como recordação?
        </Text>
        <Text style={[styles.memorialHint, { color: colors.text.secondary }]}>
          Os dados ficarão salvos mas não poderão ser editados — um memorial especial. 🐾
        </Text>
      </View>

      <View style={styles.btnCol}>
        <TouchableOpacity style={styles.btnMemorial} onPress={onMemorial} activeOpacity={0.85}>
          <MaterialCommunityIcons name="candle" size={16} color="#fff" />
          <Text style={styles.btnMemorialText}>  Sim, guardar como memorial</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnOutline, { borderColor: '#FF6B6B' }]} onPress={onDelete} activeOpacity={0.8}>
          <Text style={[styles.btnOutlineText, { color: '#FF6B6B' }]}>Não, pode excluir</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────
export default function DeleteReasonModal({
  visible,
  petName,
  onConfirmDelete,
  onMemorial,
  onClose,
}: DeleteReasonModalProps) {
  const { colors } = useTheme();
  const scale   = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const [selected, setSelected] = useState<DeleteReason | null>(null);
  const [step, setStep] = useState<'reason' | 'passed_away'>('reason');

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setStep('reason');
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      scale.setValue(0.88);
      opacity.setValue(0);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (!selected) return;
    if (selected === 'passed_away') {
      setStep('passed_away');
    } else {
      onConfirmDelete(selected);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { backgroundColor: colors.surface, transform: [{ scale }], opacity }]}
        >
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {step === 'reason' ? (
              <ReasonStep
                petName={petName}
                selected={selected}
                onSelect={setSelected}
                onConfirm={handleConfirm}
                onClose={onClose}
                colors={colors}
              />
            ) : (
              <PassedAwayStep
                petName={petName}
                onMemorial={onMemorial}
                onDelete={() => onConfirmDelete('passed_away')}
                colors={colors}
              />
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
    maxHeight: '90%',
  },
  iconWrap:   { alignItems: 'center', marginBottom: 14 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 13, textAlign: 'center', marginBottom: 20,
  },
  reasons: { gap: 10, marginBottom: 22 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 14, padding: 14,
  },
  reasonIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  reasonLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnOutline: {
    flex: 1, borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  btnOutlineText: { fontSize: 14, fontWeight: '600' },
  btnDanger: {
    flex: 1, backgroundColor: '#FF6B6B', borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnDangerText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Passed away step
  comfortText: {
    fontSize: 14, lineHeight: 22, textAlign: 'center',
    fontStyle: 'italic', marginBottom: 20,
  },
  memorialBox: {
    borderWidth: 1.5, borderRadius: 16, padding: 16,
    alignItems: 'center', marginBottom: 22,
  },
  memorialQuestion: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  memorialHint:     { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  btnCol: { gap: 10 },
  btnMemorial: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#9C27B0', borderRadius: 14, paddingVertical: 14,
  },
  btnMemorialText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
