import AsyncStorage from '@react-native-async-storage/async-storage';

export type StreakData = {
  currentStreak: number;
  bestStreak: number;
  lastOpenedDate: string; // YYYY-MM-DD
  totalDays: number;
  vacationMode?: boolean;
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Chame ao abrir o app. Atualiza a sequência e retorna os dados atualizados.
 */
export async function tickStreak(): Promise<StreakData> {
  try {
    const json = await AsyncStorage.getItem('streakData');
    const today = todayStr();
    const yesterday = yesterdayStr();

    const prev: StreakData = json
      ? JSON.parse(json)
      : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 };

    // Já abriu hoje — não incrementa
    if (prev.lastOpenedDate === today) return prev;

    let currentStreak: number;
    if (prev.lastOpenedDate === yesterday) {
      // Dia consecutivo
      currentStreak = prev.currentStreak + 1;
    } else if (prev.lastOpenedDate === '') {
      // Primeiro uso
      currentStreak = 1;
    } else if (prev.vacationMode) {
      // Modo férias ativo — mantém streak sem quebrar
      currentStreak = prev.currentStreak;
    } else {
      // Quebrou a sequência
      currentStreak = 1;
    }

    const bestStreak = Math.max(currentStreak, prev.bestStreak);
    const totalDays = prev.totalDays + 1;

    const updated: StreakData = { ...prev, currentStreak, bestStreak, lastOpenedDate: today, totalDays };
    await AsyncStorage.setItem('streakData', JSON.stringify(updated));
    return updated;
  } catch {
    return { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 };
  }
}

export async function toggleVacationMode(): Promise<StreakData> {
  try {
    const json = await AsyncStorage.getItem('streakData');
    const prev: StreakData = json
      ? JSON.parse(json)
      : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 };
    const updated: StreakData = { ...prev, vacationMode: !prev.vacationMode };
    await AsyncStorage.setItem('streakData', JSON.stringify(updated));
    return updated;
  } catch {
    return { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 };
  }
}

export async function loadStreak(): Promise<StreakData> {
  try {
    const json = await AsyncStorage.getItem('streakData');
    return json
      ? JSON.parse(json)
      : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 };
  } catch {
    return { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 };
  }
}
