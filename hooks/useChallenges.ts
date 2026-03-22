import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChallengeAction =
  | 'register_vaccine'
  | 'register_reminder'
  | 'add_pet'
  | 'view_pet'
  | 'none';

export type ChallengeDef = {
  id: string;
  title: string;
  description: string;
  tip: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
  action: ChallengeAction;
  route?: string; // rota para navegar ao pressionar o botão de ação
};

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'vaccine_week',
    title: 'Semana da Saúde',
    description: 'Registre uma vacina do seu pet no app.',
    tip: 'Abra o perfil do pet → Vacinas → Nova Vacina.',
    icon: 'needle',
    color: '#4CAF50',
    action: 'register_vaccine',
    route: '/(tabs)',
  },
  {
    id: 'reminder_week',
    title: 'Tutor Organizado',
    description: 'Crie um lembrete de banho, consulta ou medicação para o seu pet.',
    tip: 'Abra o perfil do pet → Novo Lembrete.',
    icon: 'calendar-check',
    color: '#673AB7',
    action: 'register_reminder',
    route: '/(tabs)',
  },
  {
    id: 'add_pet',
    title: 'Família Crescendo',
    description: 'Cadastre um novo pet no app.',
    tip: 'Toque em "+" na tela de Pets para adicionar.',
    icon: 'paw',
    color: '#40E0D0',
    action: 'add_pet',
    route: '/(tabs)/add-pet',
  },
  {
    id: 'vet_reminder',
    title: 'Visita ao Vet',
    description: 'Agende uma consulta veterinária criando um lembrete de "Consulta".',
    tip: 'Abra o perfil do pet → Novo Lembrete → categoria Consulta.',
    icon: 'stethoscope',
    color: '#009688',
    action: 'register_reminder',
    route: '/(tabs)',
  },
  {
    id: 'three_vaccines',
    title: 'Carteira Completa',
    description: 'Registre 3 ou mais vacinas no total.',
    tip: 'Cada pet tem sua própria carteira de vacinas. Registre no perfil do pet.',
    icon: 'shield-check',
    color: '#2196F3',
    action: 'register_vaccine',
    route: '/(tabs)',
  },
  {
    id: 'hygiene_reminder',
    title: 'Dia do Banho',
    description: 'Crie um lembrete de "Higiene" para o banho do seu pet.',
    tip: 'Abra o perfil do pet → Novo Lembrete → categoria Higiene.',
    icon: 'shower',
    color: '#00BCD4',
    action: 'register_reminder',
    route: '/(tabs)',
  },
  {
    id: 'check_pet_profile',
    title: 'Como Vai seu Pet?',
    description: 'Visite o perfil completo do seu pet e confira os lembretes.',
    tip: 'Toque no pet na tela inicial para ver todos os detalhes.',
    icon: 'magnify',
    color: '#FF9800',
    action: 'view_pet',
    route: '/(tabs)',
  },
  {
    id: 'five_reminders',
    title: 'Mestre dos Lembretes',
    description: 'Tenha 5 ou mais lembretes cadastrados no total.',
    tip: 'Crie lembretes para banho, consultas, vacinas e medicações.',
    icon: 'calendar-star',
    color: '#F44336',
    action: 'register_reminder',
    route: '/(tabs)',
  },
  {
    id: 'multi_pet',
    title: 'Mais Amor para Dar',
    description: 'Cadastre 2 ou mais pets no app.',
    tip: 'Toque em "+" na tela de Pets.',
    icon: 'paw-outline',
    color: '#9C27B0',
    action: 'add_pet',
    route: '/(tabs)/add-pet',
  },
  {
    id: 'complete_profile',
    title: 'Apresente-se!',
    description: 'Complete seu perfil com nome e uma bio.',
    tip: 'Vá em Perfil → Editar Perfil e preencha seu nome e bio.',
    icon: 'account-edit',
    color: '#FF6B9D',
    action: 'none',
    route: '/profile/edit',
  },
  {
    id: 'vaccine_booster',
    title: 'Reforço em Dia',
    description: 'Registre a data do próximo reforço em uma vacina.',
    tip: 'Ao registrar uma vacina, preencha o campo "Próximo Reforço".',
    icon: 'calendar-refresh',
    color: '#8D6E63',
    action: 'register_vaccine',
    route: '/(tabs)',
  },
  {
    id: 'health_care',
    title: 'Cuidado Total',
    description: 'Tenha pelo menos 1 pet, 1 vacina e 1 lembrete cadastrados.',
    tip: 'O cuidado completo do pet inclui agenda, saúde e atenção diária.',
    icon: 'heart',
    color: '#E91E63',
    action: 'none',
    route: '/(tabs)',
  },
];

export const getWeekKey = (): string => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const getCurrentChallenge = (): ChallengeDef => {
  const week = parseInt(getWeekKey().split('-W')[1]);
  return CHALLENGES[week % CHALLENGES.length];
};

export async function loadChallengeState(): Promise<{
  completed: boolean;
  completedIds: string[];
}> {
  try {
    const [challengeJSON, historyJSON] = await Promise.all([
      AsyncStorage.getItem('weeklyChallenge'),
      AsyncStorage.getItem('challengeHistory'),
    ]);
    const weekKey = getWeekKey();
    const saved = challengeJSON ? JSON.parse(challengeJSON) : null;
    const completed = saved?.week === weekKey && saved?.completed === true;
    const completedIds: string[] = historyJSON ? JSON.parse(historyJSON) : [];
    return { completed, completedIds };
  } catch {
    return { completed: false, completedIds: [] };
  }
}

/**
 * Verifica se o desafio atual corresponde à ação executada e o marca
 * como concluído automaticamente. Deve ser chamado após cada ação do usuário.
 */
export async function autoCompleteChallenge(action: ChallengeAction): Promise<boolean> {
  if (action === 'none') return false;
  const current = getCurrentChallenge();
  if (current.action !== action) return false;

  // Já foi concluído nesta semana?
  const weekKey = getWeekKey();
  const json = await AsyncStorage.getItem('weeklyChallenge').catch(() => null);
  const saved = json ? JSON.parse(json) : null;
  if (saved?.week === weekKey && saved?.completed === true) return false;

  await completeChallenge(current.id);
  return true;
}

/**
 * Para desafios com action: 'none', verifica condições baseadas em dados.
 * Chamar no profile após carregar os dados do usuário.
 */
export async function autoCompleteDataChallenge(data: {
  hasPets: boolean;
  hasVaccines: boolean;
  hasReminders: boolean;
  hasProfile: boolean;
}): Promise<boolean> {
  const current = getCurrentChallenge();
  if (current.action !== 'none') return false;

  const weekKey = getWeekKey();
  const json = await AsyncStorage.getItem('weeklyChallenge').catch(() => null);
  const saved = json ? JSON.parse(json) : null;
  if (saved?.week === weekKey && saved?.completed === true) return false;

  let met = false;
  if (current.id === 'complete_profile') met = data.hasProfile;
  if (current.id === 'health_care') met = data.hasPets && data.hasVaccines && data.hasReminders;

  if (met) {
    await completeChallenge(current.id);
    return true;
  }
  return false;
}

export async function completeChallenge(challengeId: string): Promise<void> {
  try {
    const weekKey = getWeekKey();
    const historyJSON = await AsyncStorage.getItem('challengeHistory');
    const history: string[] = historyJSON ? JSON.parse(historyJSON) : [];

    await Promise.all([
      AsyncStorage.setItem('weeklyChallenge', JSON.stringify({
        week: weekKey,
        completed: true,
        completedAt: new Date().toISOString(),
      })),
      AsyncStorage.setItem('challengeHistory', JSON.stringify(
        history.includes(challengeId) ? history : [...history, challengeId]
      )),
    ]);
  } catch { }
}
