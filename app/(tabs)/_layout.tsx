import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Reminder, VaccineRecord } from '../../types/pet';
import { useTranslation } from 'react-i18next';
import { getUnreadCount } from '../../services/notificationHistory';

function UrgencyDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function NotifTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const [unread, setUnread] = useState(0);
  const { colors } = useTheme();

  useFocusEffect(useCallback(() => {
    getUnreadCount().then(setUnread);
  }, []));

  return (
    <View style={styles.iconWrapper}>
      <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />
      {unread > 0 && (
        <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </View>
  );
}

function PetsTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const [hasUrgency, setHasUrgency] = useState<'danger' | 'warning' | null>(null);

  useFocusEffect(useCallback(() => {
    const check = async () => {
      try {
        const [rJSON, vJSON] = await Promise.all([
          AsyncStorage.getItem('reminders'),
          AsyncStorage.getItem('vaccinations'),
        ]);
        const reminders: Reminder[] = rJSON ? JSON.parse(rJSON) : [];
        const vaccines: VaccineRecord[] = vJSON ? JSON.parse(vJSON) : [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parseD = (s: string) => {
          const p = s.split('/');
          if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
          return new Date(s);
        };

        const overdue = reminders.some(r => { const d = parseD(r.date); d.setHours(0,0,0,0); return d < today; });
        const vaccOverdue = vaccines.some(v => {
          if (!v.nextDueDate) return false;
          const d = parseD(v.nextDueDate); d.setHours(0,0,0,0); return d < today;
        });
        const todayR = reminders.some(r => { const d = parseD(r.date); d.setHours(0,0,0,0); return d.getTime() === today.getTime(); });

        if (overdue || vaccOverdue) setHasUrgency('danger');
        else if (todayR) setHasUrgency('warning');
        else setHasUrgency(null);
      } catch { setHasUrgency(null); }
    };
    check();
  }, []));

  return (
    <View style={styles.iconWrapper}>
      <MaterialCommunityIcons name={focused ? 'paw' : 'paw-outline'} size={size} color={color} />
      {hasUrgency && (
        <UrgencyDot color={hasUrgency === 'danger' ? '#FF3B30' : '#FF9500'} />
      )}
    </View>
  );
}

// Tab bar com blur no iOS, sólida em outros
function TabBarBackground() {
  const { colors, isDarkMode } = useTheme();
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        style={StyleSheet.absoluteFill}
        tint={isDarkMode ? 'dark' : 'light'}
        intensity={85}
      />
    );
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />;
}

export default function TabLayout() {
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Altura da tab bar: garante espaço para a navigation bar do Android
  const tabBarHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 56 + insets.bottom;
  const tabBarPaddingBottom = Platform.OS === 'ios' ? insets.bottom : insets.bottom + 4;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.light,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          elevation: 12,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.pets'),
          tabBarIcon: ({ color, size, focused }) => (
            <PetsTabIcon color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: t('statistics.title'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-pet"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="comunidade"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('tabs.notifications') ?? 'Notificações',
          tabBarIcon: ({ color, size, focused }) => (
            <NotifTabIcon color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
