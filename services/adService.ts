import {
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

const REWARDED_ID = __DEV__
  ? TestIds.REWARDED
  : "ca-app-pub-4896814460874070/1840112770";

const INTERSTITIAL_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : "ca-app-pub-4896814460874070/6218129459";

// ─── Rewarded Ad com pré-carregamento ────────────────────────────────────────

let preloadedRewarded: RewardedAd | null = null;
let preloadedRewardedReady = false;
let preloadingRewarded = false;

export function preloadRewardedAd(): void {
  if (preloadingRewarded || preloadedRewardedReady) return;
  preloadingRewarded = true;

  const ad = RewardedAd.createForAdRequest(REWARDED_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    preloadedRewarded = ad;
    preloadedRewardedReady = true;
    preloadingRewarded = false;
  });

  ad.addAdEventListener(AdEventType.ERROR, () => {
    preloadedRewarded = null;
    preloadedRewardedReady = false;
    preloadingRewarded = false;
  });

  ad.load();
}

export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    // Usa o pré-carregado se disponível, senão carrega agora
    const ad = preloadedRewardedReady && preloadedRewarded
      ? preloadedRewarded
      : RewardedAd.createForAdRequest(REWARDED_ID, {
          requestNonPersonalizedAdsOnly: false,
        });

    // Reseta o pré-carregado para recarregar na próxima
    preloadedRewarded = null;
    preloadedRewardedReady = false;
    preloadingRewarded = false;

    let settled = false;
    const done = (result: boolean) => {
      if (settled) return;
      settled = true;
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
      // Pré-carrega o próximo
      setTimeout(preloadRewardedAd, 1000);
      resolve(result);
    };

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      ad.show();
    });

    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      done(true);
    });

    const unsubClosed = ad.addAdEventListener(
      // @ts-ignore
      "adClosed",
      () => done(false)
    );

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      done(false);
    });

    if (!preloadedRewardedReady) {
      ad.load();
    }
  });
}

// ─── Interstitial Ad ─────────────────────────────────────────────────────────

export function showInterstitialAd(): Promise<void> {
  return new Promise((resolve) => {
    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        interstitial.show();
      }
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        resolve();
      }
    );

    interstitial.load();
  });
}
