// Stub vazio para web — react-native-google-mobile-ads não é suportado no web
export const BannerAd = () => null;
export const BannerAdSize = {};
export const TestIds = {};
export const InterstitialAd = { createForAdRequest: () => ({ load: () => {}, show: () => {}, addAdEventListener: () => () => {} }) };
export const RewardedAd = { createForAdRequest: () => ({ load: () => {}, show: () => {}, addAdEventListener: () => () => {} }) };
export const AdEventType = {};
export const RewardedAdEventType = {};
function MobileAds() {
  return { initialize: () => Promise.resolve() };
}
export default MobileAds;
