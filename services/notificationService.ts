import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar como as notificações devem ser exibidas quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Mensagens contextuais por categoria ────────────────────────────────────

const REMINDER_MESSAGES: Record<string, { emoji: string; titles: string[]; bodies: string[] }> = {
  Higiene: {
    emoji: '🛁',
    titles: [
      '{emoji} Hora do banho, {name}!',
      '{emoji} {name} merece um banho hoje',
      '{emoji} Dia de ficar limpinho, {name}!',
    ],
    bodies: [
      '{desc} — seu pet vai adorar!',
      'Não esqueça: {desc} hoje.',
      '{desc} está no cronograma. Vamos lá!',
    ],
  },
  Saúde: {
    emoji: '💊',
    titles: [
      '{emoji} Saúde em dia para {name}',
      '{emoji} Cuidado especial: {name}',
      '{emoji} {name} precisa de atenção hoje',
    ],
    bodies: [
      '{desc} — a saúde do {name} depende de você.',
      'Não pule: {desc} é importante.',
      '{desc} agendado para hoje.',
    ],
  },
  Consulta: {
    emoji: '🩺',
    titles: [
      '{emoji} Consulta de {name} hoje!',
      '{emoji} Hora de visitar o vet com {name}',
      '{emoji} {name} tem compromisso médico',
    ],
    bodies: [
      '{desc} — não se esqueça de levar a carteirinha.',
      'Lembre-se: {desc} está marcado.',
      '{desc} — separe os documentos do {name}.',
    ],
  },
  Outro: {
    emoji: '🐾',
    titles: [
      '{emoji} Lembrete: {name}',
      '{emoji} Atenção com {name} hoje',
      '{emoji} {name} tem algo especial hoje',
    ],
    bodies: [
      '{desc}',
      'Não se esqueça: {desc}.',
      '{desc} — seu pet conta com você!',
    ],
  },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildMessage(
  template: string,
  petName: string,
  description: string,
  emoji: string,
): string {
  return template
    .replace(/\{name\}/g, petName)
    .replace(/\{desc\}/g, description)
    .replace(/\{emoji\}/g, emoji);
}

// ─── Permissões e canal ──────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Pet Agenda',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#40E0D0',
      });
      await Notifications.setNotificationChannelAsync('birthday', {
        name: 'Aniversários',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#FF6B9D',
      });
      await Notifications.setNotificationChannelAsync('reengagement', {
        name: 'Dicas e lembretes',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#40E0D0',
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao solicitar permissões de notificação:', error);
    return false;
  }
}

// ─── Lembretes ───────────────────────────────────────────────────────────────

export async function scheduleReminderNotification(
  reminderId: string,
  petName: string,
  description: string,
  date: Date,
  category: string,
  petId?: string,
): Promise<string[]> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return [];

    const msgs = REMINDER_MESSAGES[category] ?? REMINDER_MESSAGES.Outro;
    const now = new Date();
    const notificationIds: string[] = [];

    // Notificação 1 dia antes (às 9h)
    const oneDayBefore = new Date(date);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0);

    if (oneDayBefore > now) {
      const title = buildMessage(pickRandom(msgs.titles), petName, description, msgs.emoji);
      const body = buildMessage(
        `Amanhã: ${pickRandom(msgs.bodies)}`,
        petName,
        description,
        msgs.emoji,
      );
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { reminderId, petId, type: 'reminder', daysUntil: 1 },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneDayBefore,
        },
      });
      notificationIds.push(id);
    }

    // Notificação no dia (às 9h)
    const onTheDay = new Date(date);
    onTheDay.setHours(9, 0, 0, 0);

    if (onTheDay > now) {
      const title = buildMessage(pickRandom(msgs.titles), petName, description, msgs.emoji);
      const body = buildMessage(pickRandom(msgs.bodies), petName, description, msgs.emoji);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { reminderId, petId, type: 'reminder', daysUntil: 0 },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: onTheDay,
        },
      });
      notificationIds.push(id);
    }

    return notificationIds;
  } catch (error) {
    console.error('Erro ao agendar notificação de lembrete:', error);
    return [];
  }
}

// ─── Vacinas ─────────────────────────────────────────────────────────────────

export async function scheduleVaccineNotification(
  vaccineId: string,
  petName: string,
  vaccineName: string,
  nextDueDate: Date,
): Promise<string[]> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return [];

    const notificationIds: string[] = [];
    const now = new Date();

    const configs = [
      {
        daysOffset: -7,
        hour: 10,
        daysUntil: 7,
        title: `💉 Reforço de vacina em 7 dias`,
        body: `${petName} precisa do reforço de ${vaccineName} na próxima semana.`,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      {
        daysOffset: -1,
        hour: 10,
        daysUntil: 1,
        title: `💉 Reforço de ${vaccineName} amanhã!`,
        body: `Não esqueça: ${petName} precisa da vacina amanhã.`,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      {
        daysOffset: 0,
        hour: 10,
        daysUntil: 0,
        title: `💉 Hoje é dia de vacina, ${petName}!`,
        body: `Reforço de ${vaccineName} está vencendo hoje. Agende com o veterinário!`,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
    ];

    for (const cfg of configs) {
      const d = new Date(nextDueDate);
      d.setDate(d.getDate() + cfg.daysOffset);
      d.setHours(cfg.hour, 0, 0, 0);
      if (d > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: cfg.title,
            body: cfg.body,
            data: { vaccineId, type: 'vaccine', daysUntil: cfg.daysUntil },
            sound: true,
            priority: cfg.priority,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: d,
          },
        });
        notificationIds.push(id);
      }
    }

    return notificationIds;
  } catch (error) {
    console.error('Erro ao agendar notificação de vacina:', error);
    return [];
  }
}

// ─── Aniversário do pet ──────────────────────────────────────────────────────

export async function scheduleBirthdayNotification(
  petId: string,
  petName: string,
  species: string,
  dob: string, // formato DD/MM/YYYY
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // Cancelar aniversário anterior do mesmo pet
    const stored = await Notifications.getAllScheduledNotificationsAsync();
    const previous = stored.filter(n => n.content.data?.petId === petId && n.content.data?.type === 'birthday');
    for (const p of previous) {
      await Notifications.cancelScheduledNotificationAsync(p.identifier);
    }

    const parts = dob.split('/');
    if (parts.length !== 3) return null;

    const birthDay = parseInt(parts[0]);
    const birthMonth = parseInt(parts[1]) - 1; // 0-indexed

    // Calcula próximo aniversário
    const now = new Date();
    let nextBirthday = new Date(now.getFullYear(), birthMonth, birthDay, 8, 0, 0, 0);
    if (nextBirthday <= now) {
      nextBirthday = new Date(now.getFullYear() + 1, birthMonth, birthDay, 8, 0, 0, 0);
    }

    const speciesEmoji: Record<string, string> = {
      Cachorro: '🐶', Gato: '🐱', Pássaro: '🐦',
      Coelho: '🐰', Hamster: '🐹', Peixe: '🐟',
      Réptil: '🦎', Outro: '🐾',
    };
    const emoji = speciesEmoji[species] ?? '🐾';

    const age = nextBirthday.getFullYear() - parseInt(parts[2]);
    const ageText = age === 1 ? '1 aninho' : `${age} aninhos`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎂 Feliz aniversário, ${petName}!`,
        body: `Hoje o ${petName} faz ${ageText}! ${emoji} Dê um mimo especial para ele hoje.`,
        data: { petId, type: 'birthday' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextBirthday,
        ...(Platform.OS === 'android' && { channelId: 'birthday' }),
      },
    });

    return id;
  } catch (error) {
    console.error('Erro ao agendar notificação de aniversário:', error);
    return null;
  }
}

// ─── Reengajamento ───────────────────────────────────────────────────────────

const REENGAGEMENT_MESSAGES = [
  {
    title: '🐾 Seu pet está com saudade!',
    body: 'Faz alguns dias que você não abre o Pet Agenda. Que tal dar uma olhada nos lembretes?',
  },
  {
    title: '🌟 Novidades te esperando!',
    body: 'Você tem lembretes e vacinas pra conferir. Seu pet conta com você!',
  },
  {
    title: '💛 O carinho não pode esperar',
    body: 'Abra o Pet Agenda e veja se há algo pendente para o seu pet.',
  },
  {
    title: '🩺 Tudo em dia com a saúde?',
    body: 'Confira os lembretes e vacinas dos seus pets — pode ter algo importante.',
  },
];

/**
 * Agenda notificação de reengajamento para N dias a partir de agora.
 * Chame ao abrir o app — cancela a anterior e agenda a próxima.
 */
export async function scheduleReengagementNotification(daysInactive = 5): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // Cancelar reengajamentos anteriores
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const previous = scheduled.filter(n => n.content.data?.type === 'reengagement');
    for (const p of previous) {
      await Notifications.cancelScheduledNotificationAsync(p.identifier);
    }

    const fireAt = new Date();
    fireAt.setDate(fireAt.getDate() + daysInactive);
    fireAt.setHours(10, 0, 0, 0);

    const msg = pickRandom(REENGAGEMENT_MESSAGES);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { type: 'reengagement' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...(Platform.OS === 'android' && { channelId: 'reengagement' }),
      },
    });
  } catch (error) {
    console.error('Erro ao agendar notificação de reengajamento:', error);
  }
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

export async function cancelNotifications(notificationIds: string[]): Promise<void> {
  try {
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch (error) {
    console.error('Erro ao cancelar notificações:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Erro ao cancelar todas as notificações:', error);
  }
}

export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    return [];
  }
}
