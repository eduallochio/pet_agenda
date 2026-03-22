import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Reminder, VaccineRecord } from '../../types/pet';
import { useTranslation } from 'react-i18next';

function UrgencyDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.light,
        tabBarStyle: {
          // iOS: fundo transparente para o blur aparecer
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
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
});
