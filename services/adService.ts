import { RewardedAd, RewardedAdEventType, TestIds } from "react-native-google-mobile-ads";

const REWARDED_ID = __DEV__
  ? TestIds.REWARDED
  : "ca-app-pub-4896814460874070/1840112770";

export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        rewarded.show();
      }
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        resolve(true);
      }
    );

    // Se o usuário fechar sem ganhar recompensa
    const unsubscribeClosed = rewarded.addAdEventListener(
      // @ts-ignore — evento de fechamento
      "adClosed",
      () => {
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        resolve(false);
      }
    );

    rewarded.load();
  });
}
