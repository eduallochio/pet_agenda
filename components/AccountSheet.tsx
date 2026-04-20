import React, { forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { Theme } from '../constants/Colors';
import { supabase } from '../services/supabase';

export type AccountSheetUser = {
  name: string;
  email?: string;
  photoUri?: string;
};

interface AccountSheetProps {
  user: AccountSheetUser | null;
  onLogout?: () => void;
  onDismiss?: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

const AccountSheet = forwardRef<BottomSheetModal, AccountSheetProps>(
  ({ user, onLogout, onDismiss }, ref) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const router = useRouter();

    const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ), []);

    const dismiss = () => (ref as any)?.current?.dismiss();

    const handleLogin = () => {
      dismiss();
      router.push('/auth/login');
    };

    const handleProfile = () => {
      dismiss();
      router.push('/(tabs)/profile');
    };

    const handleLogout = async () => {
      dismiss();
      await supabase.auth.signOut();
      onLogout?.();
      router.replace('/auth/login');
    };

    const bgStyle = { backgroundColor: colors.surface };
    const handleStyle = { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 };
    const handleIndicatorStyle = { backgroundColor: colors.border, width: 40 };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={[user ? '38%' : '30%']}
        enableDynamicSizing={false}
        index={0}
        enablePanDownToClose
        backgroundStyle={bgStyle}
        handleStyle={handleStyle}
        handleIndicatorStyle={handleIndicatorStyle}
        backdropComponent={renderBackdrop}
        onDismiss={onDismiss}
      >
        <BottomSheetView style={[styles.container, { backgroundColor: colors.surface }]}>
          {user ? (
            <>
              {/* Avatar + info */}
              <View style={styles.userRow}>
                {user.photoUri ? (
                  <Image source={{ uri: user.photoUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: Theme.primary + '33' }]}>
                    <Text style={[styles.avatarInitials, { color: Theme.primary }]}>
                      {getInitials(user.name)}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>
                    {user.name}
                  </Text>
                  {user.email ? (
                    <Text style={[styles.userEmail, { color: colors.text.secondary }]} numberOfLines={1}>
                      {user.email}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Meu Perfil */}
              <TouchableOpacity style={styles.menuRow} onPress={handleProfile}>
                <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="person-outline" size={18} color="#2196F3" />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text.primary }]}>
                  {t('account.myProfile')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.light} />
              </TouchableOpacity>

              {/* Sair */}
              <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
                <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="log-out-outline" size={18} color="#F44336" />
                </View>
                <Text style={[styles.menuLabel, { color: '#F44336' }]}>
                  {t('account.logout')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.guestTitle, { color: colors.text.primary }]}>
                {t('account.guestTitle')}
              </Text>
              <Text style={[styles.guestSubtitle, { color: colors.text.secondary }]}>
                {t('account.guestSubtitle')}
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Entrar */}
              <TouchableOpacity style={styles.menuRow} onPress={handleLogin}>
                <View style={[styles.menuIcon, { backgroundColor: Theme.primary + '22' }]}>
                  <Ionicons name="log-in-outline" size={18} color={Theme.primary} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text.primary }]}>
                  {t('account.login')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.light} />
              </TouchableOpacity>

              {/* Criar conta */}
              <TouchableOpacity style={styles.menuRow} onPress={handleLogin}>
                <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="person-add-outline" size={18} color="#4CAF50" />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text.primary }]}>
                  {t('account.signup')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.light} />
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default AccountSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20, fontWeight: '700',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginVertical: 8 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  guestTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  guestSubtitle: { fontSize: 13, marginBottom: 4 },
});
