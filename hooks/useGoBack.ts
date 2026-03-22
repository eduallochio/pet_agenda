import { useRouter, useNavigationContainerRef } from 'expo-router';
import { useNavigation } from '@react-navigation/native';

/**
 * Hook seguro para voltar na navegação.
 * Se não houver tela anterior, navega para a tab principal.
 */
export function useGoBack(fallback: string = '/(tabs)') {
  const router = useRouter();
  const navigation = useNavigation();

  const goBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as any);
    }
  };

  return goBack;
}
