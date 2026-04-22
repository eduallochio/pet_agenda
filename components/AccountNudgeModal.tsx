import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { useTranslation } from 'react-i18next';

type Props = {
  visible: boolean;
  onCreateAccount: () => void;
  onLogin: () => void;
  onDismiss: () => void;
};

export default function AccountNudgeModal({ visible, onCreateAccount, onLogin, onDismiss }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, ...(Platform.OS === 'web' ? { boxShadow: '0 8px 32px rgba(0,0,0,0.18)' } : Shadows.large) }]}>

          {/* Ícone */}
          <View style={[styles.iconCircle, { backgroundColor: Theme.primary + '18' }]}>
            <Ionicons name="cloud-outline" size={38} color={Theme.primary} />
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('accountNudge.modalTitle')}
          </Text>

          {/* Subtítulo */}
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {t('accountNudge.modalSubtitle')}
          </Text>

          {/* Benefícios */}
          <View style={styles.benefitsRow}>
            {[
              { icon: 'sync-outline', text: t('accountNudge.syncAuto') },
              { icon: 'shield-checkmark-outline', text: t('accountNudge.secureBackup') },
              { icon: 'phone-portrait-outline', text: t('accountNudge.anyDevice') },
            ].map(b => (
              <View key={b.text} style={styles.benefit}>
                <Ionicons name={b.icon as any} size={20} color={Theme.primary} />
                <Text style={[styles.benefitText, { color: colors.text.secondary }]}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Botão criar conta */}
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: Theme.primary }]}
            onPress={onCreateAccount}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>{t('accountNudge.createAccountFree')}</Text>
          </TouchableOpacity>

          {/* Botão login */}
          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: Theme.primary + '50' }]}
            onPress={onLogin}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: Theme.primary }]}>
              {t('accountNudge.loginBtn')}
            </Text>
          </TouchableOpacity>

          {/* Fechar */}
          <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} style={styles.dismissBtn}>
            <Text style={[styles.dismissText, { color: colors.text.secondary }]}>
              {t('accountNudge.dismiss')}
            </Text>
          </TouchableOpacity>
        </View>
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
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  benefit: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissBtn: {
    paddingVertical: 4,
  },
  dismissText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
