import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  NotificationHistoryItem,
  getHistory,
  markAllAsRead,
  clearHistory,
} from '../../../services/notificationHistory';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffH < 24) return `${diffH}h atrás`;
  if (diffD === 1) return 'Ontem';
  if (diffD < 7) return `${diffD} dias atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function groupByDate(items: NotificationHistoryItem[]): { label: string; data: NotificationHistoryItem[] }[] {
  const groups: Record<string, NotificationHistoryItem[]> = {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    const d = new Date(item.createdAt); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Hoje';
    else if (d.getTime() === yesterday.getTime()) label = 'Ontem';
    else label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  return Object.entries(groups).map(([label, data]) => ({ label, data }));
}

const TYPE_CONFIG: Record<NotificationHistoryItem['type'], { icon: string; iconColor: string; bgColor: string }> = {
  reminder:     { icon: 'bell',           iconColor: '#FF9800', bgColor: '#FFF3E0' },
  vaccine:      { icon: 'needle',         iconColor: '#F44336', bgColor: '#FFEBEE' },
  birthday:     { icon: 'cake-variant',   iconColor: '#FF6B9D', bgColor: '#FCE4EC' },
  reengagement: { icon: 'trophy',         iconColor: '#4CAF50', bgColor: '#E8F5E9' },
};

// ─── Item ─────────────────────────────────────────────────────────────────────

function NotifItem({
  item,
  onPress,
}: {
  item: NotificationHistoryItem;
  onPress: () => void;
}) {
  const cfg = TYPE_CONFIG[item.type];

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}>
      {/* Unread dot */}
      {!item.read && <View style={styles.unreadDot} />}

      {/* Icon */}
      <View style={[styles.itemIcon, { backgroundColor: cfg.bgColor }]}>
        <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);

  useFocusEffect(useCallback(() => {
    getHistory().then(h => {
      setHistory(h);
      markAllAsRead();
    });
  }, []));

  const handlePress = (item: NotificationHistoryItem) => {
    if (item.reminderId && item.petId) {
      router.push({ pathname: '/pet/[id]', params: { id: item.petId } });
    } else if (item.vaccineId && item.petId) {
      router.push({ pathname: '/vaccines/[petId]', params: { petId: item.petId } });
    } else if (item.petId) {
      router.push({ pathname: '/pet/[id]', params: { id: item.petId } });
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Limpar notificações',
      'Deseja remover todo o histórico de notificações?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar tudo',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const groups = groupByDate(history);

  // Flatten groups for FlatList with headers
  type FlatItem =
    | { kind: 'header'; label: string; key: string }
    | { kind: 'item'; data: NotificationHistoryItem; key: string };

  const flatData: FlatItem[] = groups.flatMap(g => [
    { kind: 'header' as const, label: g.label, key: `h-${g.label}` },
    ...g.data.map(d => ({ kind: 'item' as const, data: d, key: d.id })),
  ]);

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('tabs.notifications')}</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearBtnText}>{t('common.clearAll')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="bell-outline" size={44} color="#999999" />
          </View>
          <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>{t('notifications.emptyDesc')}</Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return <Text style={styles.groupLabel}>{item.label}</Text>;
            }
            return (
              <NotifItem
                item={item.data}
                onPress={() => handlePress(item.data)}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111111' },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: '#40E0D0' },

  // List
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 },
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    marginBottom: 10,
  },

  // Item — white card with border, matches design
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 3 },
  itemBody: { fontSize: 12, color: '#666666', lineHeight: 17, marginBottom: 3 },
  itemTime: { fontSize: 11, color: '#999999' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#40E0D0',
    flexShrink: 0,
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111111', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 21 },
});
