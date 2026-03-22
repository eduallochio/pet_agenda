/**
 * AdBanner — Banner fixo do Google AdMob (mobile apenas).
 *
 * O arquivo AdBanner.web.tsx é carregado automaticamente na web (retorna null).
 * Este arquivo só é bundlado em iOS e Android.
 *
 * ANTES DE PUBLICAR:
 * 1. Crie uma conta no Google AdMob (admob.google.com)
 * 2. Crie um app e dois ad units (Banner) — um para Android, um para iOS
 * 3. Substitua ANDROID_BANNER_ID e IOS_BANNER_ID pelos IDs reais
 * 4. Substitua os androidAppId e iosAppId no app.json também
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../hooks/useTheme';

// ─── IDs de produção (substituir antes de publicar) ───────────────────────────
const ANDROID_BANNER_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const IOS_BANNER_ID     = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
// ─────────────────────────────────────────────────────────────────────────────

export default function AdBanner() {
  const { colors } = useTheme();

  const adUnitId = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : Platform.OS === 'android' ? ANDROID_BANNER_ID : IOS_BANNER_ID;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    borderTopWidth: 1,
    paddingVertical: 2,
  },
});
