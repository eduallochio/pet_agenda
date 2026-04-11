import { Platform } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

const BANNER_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : "ca-app-pub-4896814460874070/8156342753";

export default function AdBanner() {
  if (Platform.OS === "ios") return null; // iOS em breve

  return (
    <BannerAd
      unitId={BANNER_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: false }}
    />
  );
}
