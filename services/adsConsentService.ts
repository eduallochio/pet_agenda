import { AdsConsent, AdsConsentStatus } from "react-native-google-mobile-ads";

/**
 * Inicializa o UMP SDK (User Messaging Platform) do Google AdMob.
 * Deve ser chamado uma vez na inicialização do app, antes de carregar anúncios.
 * Exibe o formulário de consentimento GDPR/LGPD automaticamente se necessário.
 */
export async function requestAdsConsent(): Promise<void> {
  try {
    const info = await AdsConsent.requestInfoUpdate();

    // Exibe o formulário se necessário (usuário ainda não consentiu ou consentimento expirou)
    if (
      info.isConsentFormAvailable &&
      info.status === AdsConsentStatus.REQUIRED
    ) {
      await AdsConsent.showForm();
    }
  } catch (e) {
    if (__DEV__) console.warn("[AdsConsent] Erro ao solicitar consentimento:", e);
  }
}

/**
 * Retorna se o usuário consentiu com anúncios personalizados.
 */
export async function canShowPersonalizedAds(): Promise<boolean> {
  try {
    const info = await AdsConsent.requestInfoUpdate();
    return (
      info.status === AdsConsentStatus.OBTAINED ||
      info.status === AdsConsentStatus.NOT_REQUIRED
    );
  } catch {
    return true; // fallback: exibe anúncios (fora da zona GDPR)
  }
}
