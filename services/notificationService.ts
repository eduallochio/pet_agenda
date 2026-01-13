import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar como as notificações devem ser exibidas quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Solicita permissão para enviar notificações
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permissão de notificação negada');
      return false;
    }

    // Configurar canal de notificação para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Pet Agenda',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#40E0D0',
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao solicitar permissões de notificação:', error);
    return false;
  }
}

/**
 * Agenda notificação para lembrete de pet
 */
export async function scheduleReminderNotification(
  reminderId: string,
  petName: string,
  description: string,
  date: Date,
  category: string
): Promise<string[]> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Sem permissão para agendar notificação');
      return [];
    }

    const notificationIds: string[] = [];
    const now = new Date();

    // Notificação 1 dia antes (às 9h)
    const oneDayBefore = new Date(date);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0);

    if (oneDayBefore > now) {
      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 Lembrete amanhã: ${petName}`,
          body: `${category}: ${description}`,
          data: { reminderId, type: 'reminder', daysUntil: 1 },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: oneDayBefore,
      });
      notificationIds.push(id1);
    }

    // Notificação no dia (às 9h)
    const onTheDay = new Date(date);
    onTheDay.setHours(9, 0, 0, 0);

    if (onTheDay > now) {
      const id2 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ Hoje: ${petName}`,
          body: `${category}: ${description}`,
          data: { reminderId, type: 'reminder', daysUntil: 0 },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: onTheDay,
      });
      notificationIds.push(id2);
    }

    console.log(`${notificationIds.length} notificação(ões) agendada(s) para o lembrete ${reminderId}`);
    return notificationIds;
  } catch (error) {
    console.error('Erro ao agendar notificação de lembrete:', error);
    return [];
  }
}

/**
 * Agenda notificação para reforço de vacina
 */
export async function scheduleVaccineNotification(
  vaccineId: string,
  petName: string,
  vaccineName: string,
  nextDueDate: Date
): Promise<string[]> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Sem permissão para agendar notificação');
      return [];
    }

    const notificationIds: string[] = [];
    const now = new Date();

    // Notificação 7 dias antes (às 10h)
    const sevenDaysBefore = new Date(nextDueDate);
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
    sevenDaysBefore.setHours(10, 0, 0, 0);

    if (sevenDaysBefore > now) {
      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💉 Reforço de vacina em 7 dias`,
          body: `${petName} - ${vaccineName}`,
          data: { vaccineId, type: 'vaccine', daysUntil: 7 },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: sevenDaysBefore,
      });
      notificationIds.push(id1);
    }

    // Notificação 1 dia antes (às 10h)
    const oneDayBefore = new Date(nextDueDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(10, 0, 0, 0);

    if (oneDayBefore > now) {
      const id2 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💉 Reforço de vacina amanhã`,
          body: `${petName} - ${vaccineName}`,
          data: { vaccineId, type: 'vaccine', daysUntil: 1 },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: oneDayBefore,
      });
      notificationIds.push(id2);
    }

    // Notificação no dia (às 10h)
    const onTheDay = new Date(nextDueDate);
    onTheDay.setHours(10, 0, 0, 0);

    if (onTheDay > now) {
      const id3 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💉 Reforço de vacina HOJE`,
          body: `${petName} - ${vaccineName}`,
          data: { vaccineId, type: 'vaccine', daysUntil: 0 },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: onTheDay,
      });
      notificationIds.push(id3);
    }

    console.log(`${notificationIds.length} notificação(ões) agendada(s) para a vacina ${vaccineId}`);
    return notificationIds;
  } catch (error) {
    console.error('Erro ao agendar notificação de vacina:', error);
    return [];
  }
}

/**
 * Cancela todas as notificações associadas a um ID
 */
export async function cancelNotifications(notificationIds: string[]): Promise<void> {
  try {
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    console.log(`${notificationIds.length} notificação(ões) cancelada(s)`);
  } catch (error) {
    console.error('Erro ao cancelar notificações:', error);
  }
}

/**
 * Cancela TODAS as notificações agendadas (útil para debug)
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Todas as notificações foram canceladas');
  } catch (error) {
    console.error('Erro ao cancelar todas as notificações:', error);
  }
}

/**
 * Lista todas as notificações agendadas (útil para debug)
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`${notifications.length} notificação(ões) agendada(s):`);
    notifications.forEach((notif) => {
      console.log(`- ${notif.content.title} (ID: ${notif.identifier})`);
    });
    return notifications;
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    return [];
  }
}
