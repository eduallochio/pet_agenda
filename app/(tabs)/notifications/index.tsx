import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../../constants/Colors';
import { Shadows } from '../../../constants/Shadows';
import {
  NotificationHistoryItem,
  getHistory,
  markAllAsRead,
  deleteFromHistory,
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

const TYPE_CONFIG: Record<NotificationHistoryItem['type'], { icon: string; color: string; lib: 'ion' | 'mci' }> = {
  reminder:     { icon: 'calendar',        color: '#FF9800', lib: 'mci' },
  vaccine:      { icon: 'needle',          color: '#4CAF50', lib: 'mci' },
  birthday:     { icon: 'cake-variant',    color: '#FF6B9D', lib: 'mci' },
  reengagement: { icon: 'paw',             color: Theme.primary, lib: 'mci' },
};

// ─── Item ─────────────────────────────────────────────────────────────────────

function NotifItem({
  item,
  onPress,
  onDelete,
}: {
  item: NotificationHistoryItem;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const cfg = TYPE_CONFIG[item.type];

  return (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: colors.surface },
        !item.read && { borderLeftColor: cfg.color },
        !item.read && styles.itemUnread,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Ícone */}
      <View style={[styles.itemIcon, { backgroundColor: cfg.color + '18' }]}>
        <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>

      {/* Conteúdo */}
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.text.primary }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.itemBody, { color: colors.text.secondary }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.itemTime, { color: colors.text.light }]}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>

      {/* Dot não lido */}
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.text.light} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors } = useTheme();
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

  const handleDelete = async (id: string) => {
    await deleteFromHistory(id);
    setHistory(prev => prev.filter(i => i.id !== id));
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
  const unread = history.filter(i => !i.read).length;

  const renderItem = ({ item }: { item: NotificationHistoryItem }) => (
    <NotifItem
      item={item}
      onPress={() => handlePress(item)}
      onDelete={() => handleDelete(item.id)}
    />
  );

  const renderSectionHeader = (label: string) => (
    <Text style={[styles.groupLabel, { color: colors.text.secondary }]}>{label}</Text>
  );

  // Achatar grupos para FlatList com headers
  type FlatItem =
    | { kind: 'header'; label: string; key: string }
    | { kind: 'item'; data: NotificationHistoryItem; key: string };

  const flatData: FlatItem[] = groups.flatMap(g => [
    { kind: 'header' as const, label: g.label, key: `h-${g.label}` },
    ...g.data.map(d => ({ kind: 'item' as const, data: d, key: d.id })),
  ]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Notificações</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={[styles.clearBtnText, { color: colors.text.secondary }]}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        /* Empty state */
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="bell-outline" size={44} color={colors.text.light} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            Tudo tranquilo por aqui
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.text.secondary }]}>
            Suas notificações de lembretes, vacinas e aniversários vão aparecer aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.kind === 'header') return renderSectionHeader(item.label);
            return renderItem({ item: item.data });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  clearBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  clearBtnText: { fontSize: 13, fontWeight: '600' },

  // List
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Item
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 0,
    ...Shadows.small,
  },
  itemUnread: {
    borderLeftWidth: 3,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  itemContent: { flex: 1, marginRight: 8 },
  itemTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  itemBody: { fontSize: 13, lineHeight: 18, marginBottom: 5 },
  itemTime: { fontSize: 11 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    marginTop: 6, marginRight: 4, flexShrink: 0,
  },
  deleteBtn: {
    padding: 4,
    marginTop: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.small,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
