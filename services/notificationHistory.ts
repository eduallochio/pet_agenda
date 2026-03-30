import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'notificationHistory';
const MAX_ITEMS = 100;

export type NotificationHistoryItem = {
  id: string;
  type: 'reminder' | 'vaccine' | 'birthday' | 'reengagement';
  title: string;
  body: string;
  createdAt: string; // ISO string
  read: boolean;
  // contexto para navegação
  petId?: string;
  reminderId?: string;
  vaccineId?: string;
};

export async function getHistory(): Promise<NotificationHistoryItem[]> {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function addToHistory(item: Omit<NotificationHistoryItem, 'id' | 'createdAt' | 'read'>): Promise<void> {
  try {
    const history = await getHistory();
    const newItem: NotificationHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    // Mantém só os últimos MAX_ITEMS
    const updated = [newItem, ...history].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function markAllAsRead(): Promise<void> {
  try {
    const history = await getHistory();
    const updated = history.map(item => ({ ...item, read: true }));
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function markAsRead(id: string): Promise<void> {
  try {
    const history = await getHistory();
    const updated = history.map(item => item.id === id ? { ...item, read: true } : item);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function deleteFromHistory(id: string): Promise<void> {
  try {
    const history = await getHistory();
    const updated = history.filter(item => item.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {}
}

export async function getUnreadCount(): Promise<number> {
  const history = await getHistory();
  return history.filter(item => !item.read).length;
}
