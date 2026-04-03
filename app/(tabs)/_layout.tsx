import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/Colors';
import { useTheme } from '../../hooks/useTheme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TABS = [
  {
    name: 'index',
    labelKey: 'tabs.pets',
    labelDefault: 'PETS',
    icon: (color: string) => <MaterialCommunityIcons name="paw" size={18} color={color} />,
  },
  {
    name: 'agenda',
    labelKey: 'tabs.agenda',
    labelDefault: 'AGENDA',
    icon: (color: string) => <Ionicons name="calendar" size={18} color={color} />,
  },
  {
    name: 'statistics',
    labelKey: 'tabs.stats',
    labelDefault: 'STATS',
    icon: (color: string) => <Ionicons name="bar-chart" size={18} color={color} />,
  },
  {
    name: 'profile',
    labelKey: 'tabs.profile',
    labelDefault: 'PERFIL',
    icon: (color: string) => <Ionicons name="person" size={18} color={color} />,
  },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const bgColor = isDarkMode ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2C2C2C' : '#E8E8E8';
  const inactiveColor = isDarkMode ? '#666666' : '#999999';

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom, height: 82 + insets.bottom, backgroundColor: bgColor, borderTopColor: borderColor }]}>
      <View style={[styles.pill, { backgroundColor: bgColor, borderColor }]}>
        {TABS.map((tab) => {
          const route = state.routes.find(r => r.name === tab.name);
          const isFocused = route ? state.index === state.routes.indexOf(route) : false;
          const color = isFocused ? '#FFFFFF' : inactiveColor;

          const onPress = () => {
            if (route) {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }
          };

          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              {tab.icon(color)}
              <Text style={[styles.tabLabel, { color }]}>
                {t(tab.labelKey, { defaultValue: tab.labelDefault }).toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.pets', { defaultValue: 'Pets' }) }} />
      <Tabs.Screen name="add-pet" options={{ href: null }} />
      <Tabs.Screen name="comunidade" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="agenda" options={{ title: t('tabs.agenda', { defaultValue: 'Agenda' }) }} />
      <Tabs.Screen name="statistics" options={{ title: t('tabs.stats', { defaultValue: 'Stats' }) }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile', { defaultValue: 'Perfil' }) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingHorizontal: 16,
    paddingTop: 8,
    ...(Platform.OS === 'android' ? { elevation: 8 } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    }),
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 4,
    height: 62,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: Theme.primary,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
