import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, Reminder, VaccineRecord, Achievement, WeightRecord } from '../types/pet';
import { StreakData } from './useStreak';
import { syncAchievements } from '../services/syncService';

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
  group: AchievementGroup;
  check: (data: CheckData) => boolean;
};

export type AchievementGroup =
  | 'pets'
  | 'lembretes'
  | 'vacinas'
  | 'streak'
  | 'saude'
  | 'diversidade'
  | 'marcos';

export type CheckData = {
  pets: Pet[];
  reminders: Reminder[];
  vaccines: VaccineRecord[];
  weightRecords: WeightRecord[];
  streak: StreakData;
  unlocked: string[];
};

export type AchievementGroupDef = {
  id: AchievementGroup;
  label: string;
  icon: string;
  color: string;
};

export const ACHIEVEMENT_GROUPS: AchievementGroupDef[] = [
  { id: 'pets',        label: 'Pets & Família',       icon: 'paw',              color: '#40E0D0' },
  { id: 'lembretes',   label: 'Lembretes',             icon: 'calendar-check',   color: '#FF9800' },
  { id: 'vacinas',     label: 'Vacinas',               icon: 'needle',           color: '#4CAF50' },
  { id: 'streak',      label: 'Sequência',             icon: 'fire',             color: '#FF6B00' },
  { id: 'saude',       label: 'Peso & Saúde',          icon: 'scale-bathroom',   color: '#9C27B0' },
  { id: 'diversidade', label: 'Diversidade',           icon: 'elephant',         color: '#8D6E63' },
  { id: 'marcos',      label: 'Marcos Especiais',      icon: 'trophy',           color: '#FFB800' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAgeYears(dob: string): number {
  const parts = dob.split('/');
  if (parts.length !== 3) return 0;
  const birth = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const now = new Date();
  return Math.floor(
    ((now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())) / 12
  );
}

function isBirthdayToday(dob: string): boolean {
  const parts = dob.split('/');
  if (parts.length !== 3) return false;
  const now = new Date();
  return parseInt(parts[0]) === now.getDate() && parseInt(parts[1]) - 1 === now.getMonth();
}

// ─── Definições ───────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [

  // ── Pets & Família ──────────────────────────────────────────────────────────
  {
    id: 'first_pet',
    title: 'Primeiro Amigo',
    description: 'Cadastrou o primeiro pet',
    icon: 'paw',
    color: '#40E0D0',
    group: 'pets',
    check: ({ pets }) => pets.length >= 1,
  },
  {
    id: 'three_pets',
    title: 'Família Grande',
    description: 'Cadastrou 3 ou mais pets',
    icon: 'paw-outline',
    color: '#9C27B0',
    group: 'pets',
    check: ({ pets }) => pets.length >= 3,
  },
  {
    id: 'five_pets',
    title: 'Matilha',
    description: 'Cadastrou 5 ou mais pets',
    icon: 'dog-side',
    color: '#FF6B9D',
    group: 'pets',
    check: ({ pets }) => pets.length >= 5,
  },
  {
    id: 'ten_pets',
    title: 'Fazendeiro',
    description: 'Cadastrou 10 ou mais pets',
    icon: 'barn',
    color: '#8D6E63',
    group: 'pets',
    check: ({ pets }) => pets.length >= 10,
  },
  {
    id: 'breed_filled',
    title: 'Especialista',
    description: 'Cadastrou um pet com raça preenchida',
    icon: 'certificate-outline',
    color: '#2196F3',
    group: 'pets',
    check: ({ pets }) => pets.some(p => !!p.breed && p.breed.trim().length > 0),
  },
  {
    id: 'photo_added',
    title: 'Fotogênico',
    description: 'Adicionou foto a um pet',
    icon: 'camera-outline',
    color: '#E91E63',
    group: 'pets',
    check: ({ pets }) => pets.some(p => !!p.photoUri),
  },
  {
    id: 'birthday_today',
    title: 'Parabéns!',
    description: 'Hoje é aniversário de um pet',
    icon: 'cake-variant',
    color: '#FF9800',
    group: 'pets',
    check: ({ pets }) => pets.some(p => !!p.dob && isBirthdayToday(p.dob)),
  },
  {
    id: 'senior_pet',
    title: 'Veterano',
    description: 'Tem um pet com 10 ou mais anos',
    icon: 'heart-pulse',
    color: '#F44336',
    group: 'pets',
    check: ({ pets }) => pets.some(p => !!p.dob && calcAgeYears(p.dob) >= 10),
  },

  // ── Lembretes ───────────────────────────────────────────────────────────────
  {
    id: 'first_reminder',
    title: 'Organizado',
    description: 'Criou o primeiro lembrete',
    icon: 'calendar-check',
    color: '#FF9800',
    group: 'lembretes',
    check: ({ reminders }) => reminders.length >= 1,
  },
  {
    id: 'five_reminders',
    title: 'Super Tutor',
    description: 'Criou 5 ou mais lembretes',
    icon: 'calendar-star',
    color: '#F44336',
    group: 'lembretes',
    check: ({ reminders }) => reminders.length >= 5,
  },
  {
    id: 'ten_reminders',
    title: 'Agenda Cheia',
    description: 'Criou 10 ou mais lembretes',
    icon: 'calendar-month',
    color: '#9C27B0',
    group: 'lembretes',
    check: ({ reminders }) => reminders.length >= 10,
  },
  {
    id: 'all_categories',
    title: 'Completo',
    description: 'Usou todas as 4 categorias de lembrete',
    icon: 'view-grid',
    color: '#009688',
    group: 'lembretes',
    check: ({ reminders }) =>
      new Set(reminders.map(r => r.category)).size >= 4,
  },
  {
    id: 'recurring_reminder',
    title: 'Rotineiro',
    description: 'Criou um lembrete recorrente',
    icon: 'repeat',
    color: '#3F51B5',
    group: 'lembretes',
    check: ({ reminders }) =>
      reminders.some(r => r.recurrence && r.recurrence !== 'none'),
  },
  {
    id: 'health_reminder',
    title: 'Médico Fiel',
    description: 'Criou 3 ou mais lembretes de Saúde',
    icon: 'medical-bag',
    color: '#4CAF50',
    group: 'lembretes',
    check: ({ reminders }) =>
      reminders.filter(r => r.category === 'Saúde').length >= 3,
  },
  {
    id: 'hygiene_reminder',
    title: 'Limpinho',
    description: 'Criou 3 ou mais lembretes de Higiene',
    icon: 'shower-head',
    color: '#2196F3',
    group: 'lembretes',
    check: ({ reminders }) =>
      reminders.filter(r => r.category === 'Higiene').length >= 3,
  },

  // ── Vacinas ─────────────────────────────────────────────────────────────────
  {
    id: 'first_vaccine',
    title: 'Vacinado!',
    description: 'Registrou a primeira vacina',
    icon: 'needle',
    color: '#4CAF50',
    group: 'vacinas',
    check: ({ vaccines }) => vaccines.length >= 1,
  },
  {
    id: 'vaccine_up_to_date',
    title: 'Saúde em Dia',
    description: 'Tem 3 ou mais vacinas registradas',
    icon: 'shield-check',
    color: '#2196F3',
    group: 'vacinas',
    check: ({ vaccines }) => vaccines.length >= 3,
  },
  {
    id: 'ten_vaccines',
    title: 'Imunizado',
    description: 'Registrou 10 ou mais vacinas',
    icon: 'shield-star',
    color: '#009688',
    group: 'vacinas',
    check: ({ vaccines }) => vaccines.length >= 10,
  },
  {
    id: 'next_dose',
    title: 'Previdente',
    description: 'Agendou a próxima dose de uma vacina',
    icon: 'calendar-clock',
    color: '#FF9800',
    group: 'vacinas',
    check: ({ vaccines }) => vaccines.some(v => !!v.nextDueDate),
  },
  {
    id: 'all_pets_vaccinated',
    title: 'Proteção Total',
    description: 'Todos os pets têm ao menos 1 vacina',
    icon: 'shield-home',
    color: '#4CAF50',
    group: 'vacinas',
    check: ({ pets, vaccines }) =>
      pets.length > 0 &&
      pets.every(p => vaccines.some(v => v.petId === p.id)),
  },

  // ── Sequência ───────────────────────────────────────────────────────────────
  {
    id: 'streak_3',
    title: 'Começando',
    description: 'Abriu o app 3 dias seguidos',
    icon: 'fire',
    color: '#FFB800',
    group: 'streak',
    check: ({ streak }) => streak.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Semana Perfeita',
    description: 'Abriu o app 7 dias seguidos',
    icon: 'fire',
    color: '#FF9500',
    group: 'streak',
    check: ({ streak }) => streak.currentStreak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Mês Dedicado',
    description: 'Abriu o app 30 dias seguidos',
    icon: 'fire',
    color: '#FF6B00',
    group: 'streak',
    check: ({ streak }) => streak.currentStreak >= 30,
  },
  {
    id: 'streak_100',
    title: 'Lenda',
    description: 'Abriu o app 100 dias seguidos',
    icon: 'lightning-bolt',
    color: '#F44336',
    group: 'streak',
    check: ({ streak }) => streak.currentStreak >= 100,
  },
  {
    id: 'total_30_days',
    title: 'Usuário Fiel',
    description: 'Usou o app em 30 dias no total',
    icon: 'calendar-heart',
    color: '#E91E63',
    group: 'streak',
    check: ({ streak }) => streak.totalDays >= 30,
  },

  // ── Peso & Saúde ────────────────────────────────────────────────────────────
  {
    id: 'first_weight',
    title: 'Primeira Pesagem',
    description: 'Registrou o peso de um pet',
    icon: 'scale-bathroom',
    color: '#9C27B0',
    group: 'saude',
    check: ({ weightRecords }) => weightRecords.length >= 1,
  },
  {
    id: 'weight_history',
    title: 'Histórico Saudável',
    description: 'Tem 5 ou mais registros de peso',
    icon: 'chart-line',
    color: '#673AB7',
    group: 'saude',
    check: ({ weightRecords }) => weightRecords.length >= 5,
  },
  {
    id: 'weight_all_pets',
    title: 'Controle Total',
    description: 'Todos os pets têm peso registrado',
    icon: 'scale-balance',
    color: '#512DA8',
    group: 'saude',
    check: ({ pets, weightRecords }) =>
      pets.length > 0 &&
      pets.every(p => weightRecords.some(w => w.petId === p.id)),
  },
  {
    id: 'dedicated',
    title: 'Tutor Dedicado',
    description: 'Tem pets, vacinas e lembretes cadastrados',
    icon: 'heart',
    color: '#FF6B9D',
    group: 'saude',
    check: ({ pets, vaccines, reminders }) =>
      pets.length >= 1 && vaccines.length >= 1 && reminders.length >= 1,
  },

  // ── Diversidade ─────────────────────────────────────────────────────────────
  {
    id: 'all_species',
    title: 'Arca de Noé',
    description: 'Tem pets de 3 espécies diferentes',
    icon: 'elephant',
    color: '#8D6E63',
    group: 'diversidade',
    check: ({ pets }) => new Set(pets.map(p => p.species)).size >= 3,
  },
  {
    id: 'five_species',
    title: 'Zoológico',
    description: 'Tem pets de 5 espécies diferentes',
    icon: 'owl',
    color: '#795548',
    group: 'diversidade',
    check: ({ pets }) => new Set(pets.map(p => p.species)).size >= 5,
  },
  {
    id: 'cat_and_dog',
    title: 'Clássico',
    description: 'Tem um gato e um cachorro',
    icon: 'cat',
    color: '#FF6B9D',
    group: 'diversidade',
    check: ({ pets }) => {
      const species = pets.map(p => p.species.toLowerCase());
      return (
        (species.includes('cachorro') || species.includes('cão') || species.includes('cao')) &&
        species.includes('gato')
      );
    },
  },
  {
    id: 'exotic_pet',
    title: 'Exótico',
    description: 'Tem um réptil, peixe ou pássaro',
    icon: 'fish',
    color: '#29B6F6',
    group: 'diversidade',
    check: ({ pets }) => {
      const exotic = ['réptil', 'reptil', 'peixe', 'pássaro', 'passaro', 'tartaruga', 'iguana'];
      return pets.some(p => exotic.some(e => p.species.toLowerCase().includes(e)));
    },
  },

  // ── Marcos Especiais ────────────────────────────────────────────────────────
  {
    id: 'master_tutor',
    title: 'Tutor Master',
    description: 'Desbloqueou 10 ou mais conquistas',
    icon: 'trophy-outline',
    color: '#FFB800',
    group: 'marcos',
    check: ({ unlocked }) => unlocked.length >= 10,
  },
  {
    id: 'completionist',
    title: 'Perfeccionista',
    description: 'Desbloqueou todas as conquistas',
    icon: 'trophy',
    color: '#FF8C00',
    group: 'marcos',
    // -1 porque esta própria conquista não está desbloqueada quando o check roda
    check: ({ unlocked }) => unlocked.length >= ACHIEVEMENTS.length - 1,
  },
];

// ─── Funções públicas ─────────────────────────────────────────────────────────

export async function checkAndUnlockAchievements(
  data: Omit<CheckData, 'unlocked'>
): Promise<string[]> {
  try {
    const [achJSON, weightJSON, streakJSON] = await Promise.all([
      AsyncStorage.getItem('achievements'),
      AsyncStorage.getItem('weightRecords'),
      AsyncStorage.getItem('streakData'),
    ]);

    const existing: Achievement[] = achJSON ? JSON.parse(achJSON) : [];
    const unlockedIds = existing.map(a => a.id);

    const weightRecords: WeightRecord[] = weightJSON ? JSON.parse(weightJSON) : [];
    const streak: StreakData = streakJSON
      ? JSON.parse(streakJSON)
      : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 };

    const fullData: CheckData = {
      ...data,
      weightRecords,
      streak,
      unlocked: unlockedIds,
    };

    const newlyUnlocked: Achievement[] = [];

    for (const def of ACHIEVEMENTS) {
      if (unlockedIds.includes(def.id)) continue;
      if (def.check(fullData)) {
        newlyUnlocked.push({ id: def.id, unlockedAt: new Date().toISOString() });
      }
    }

    if (newlyUnlocked.length > 0) {
      const updated = [...existing, ...newlyUnlocked];
      await AsyncStorage.setItem('achievements', JSON.stringify(updated));
      syncAchievements(updated); // fire-and-forget sync to Supabase
    }

    return newlyUnlocked.map(a => a.id);
  } catch {
    return [];
  }
}

export async function getUnlockedAchievements(): Promise<Achievement[]> {
  try {
    const json = await AsyncStorage.getItem('achievements');
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/** Retorna conquistas agrupadas para exibição em UI */
export function groupAchievements(unlockedIds: string[]): {
  group: AchievementGroupDef;
  achievements: AchievementDef[];
  unlockedCount: number;
}[] {
  return ACHIEVEMENT_GROUPS.map(group => {
    const achievements = ACHIEVEMENTS.filter(a => a.group === group.id);
    const unlockedCount = achievements.filter(a => unlockedIds.includes(a.id)).length;
    return { group, achievements, unlockedCount };
  });
}

export type AchievementProgress = { current: number; target: number } | null;

/**
 * Retorna o progresso numérico de uma conquista ainda não desbloqueada.
 * Retorna null para conquistas já desbloqueadas ou sem progresso rastreável.
 */
export function getAchievementProgress(
  achId: string,
  data: Omit<CheckData, 'unlocked'>
): AchievementProgress {
  const { pets, reminders, vaccines, weightRecords, streak } = data;
  switch (achId) {
    case 'three_pets':       return { current: Math.min(pets.length, 3), target: 3 };
    case 'five_pets':        return { current: Math.min(pets.length, 5), target: 5 };
    case 'ten_pets':         return { current: Math.min(pets.length, 10), target: 10 };
    case 'five_reminders':   return { current: Math.min(reminders.length, 5), target: 5 };
    case 'ten_reminders':    return { current: Math.min(reminders.length, 10), target: 10 };
    case 'health_reminder':  return { current: Math.min(reminders.filter(r => r.category === 'Saúde').length, 3), target: 3 };
    case 'hygiene_reminder': return { current: Math.min(reminders.filter(r => r.category === 'Higiene').length, 3), target: 3 };
    case 'vaccine_up_to_date': return { current: Math.min(vaccines.length, 3), target: 3 };
    case 'ten_vaccines':     return { current: Math.min(vaccines.length, 10), target: 10 };
    case 'streak_3':         return { current: Math.min(streak.currentStreak, 3), target: 3 };
    case 'streak_7':         return { current: Math.min(streak.currentStreak, 7), target: 7 };
    case 'streak_30':        return { current: Math.min(streak.currentStreak, 30), target: 30 };
    case 'streak_100':       return { current: Math.min(streak.currentStreak, 100), target: 100 };
    case 'total_30_days':    return { current: Math.min(streak.totalDays, 30), target: 30 };
    case 'weight_history':   return { current: Math.min(weightRecords.length, 5), target: 5 };
    case 'master_tutor':     return null; // unlocked.length não disponível aqui
    default:                 return null;
  }
}
