import { Platform } from "react-native";

// Importação lazy — evita que o bundler web carregue módulos nativos do AdMob
let BannerAd: any, BannerAdSize: any, TestIds: any;
if (Platform.OS !== "web") {
  const ads = require("react-native-google-mobile-ads");
  BannerAd     = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds      = ads.TestIds;
}

export default function AdBanner() {
  if (Platform.OS === "web" || Platform.OS === "ios") return null;

  const BANNER_ID = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : "ca-app-pub-4896814460874070/7531211120";

  return (
    <BannerAd
      unitId={BANNER_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: false }}
    />
  );
}
