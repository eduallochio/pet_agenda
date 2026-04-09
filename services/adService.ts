/**
 * adService — aguardando versão de react-native-google-mobile-ads
 * compatível com Expo 53 / RN 0.79.
 * IDs salvos: Rewarded ca-app-pub-4896814460874070/1840112770
 */
export function showRewardedAd(): Promise<boolean> {
  // Temporariamente libera sem mostrar anúncio
  return Promise.resolve(true);
}
