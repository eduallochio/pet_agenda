import React, { useState, useRef, useCallback } from 'react';
import {
  Animated, View, Text, TouchableOpacity, StyleSheet, Platform, LayoutAnimation, UIManager,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { AchievementDef, AchievementGroupDef, AchievementProgress } from '../hooks/useAchievements';
import { Achievement } from '../types/pet';
import { useTranslation } from 'react-i18next';

// Habilita LayoutAnimation no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

interface AchievementGroupSectionProps {
  group: AchievementGroupDef;
  achievements: AchievementDef[];
  unlockedCount: number;
  unlockedAchievements: Achievement[];
  /** Mapa de id → progresso para conquistas bloqueadas */
  progressMap?: Record<string, AchievementProgress>;
  /** Começa recolhido? Padrão: false */
  defaultCollapsed?: boolean;
}

export default function AchievementGroupSection({
  group,
  achievements,
  unlockedCount,
  unlockedAchievements,
  progressMap = {},
  defaultCollapsed = false,
}: AchievementGroupSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Rotação do chevron
  const rotation = useRef(new Animated.Value(defaultCollapsed ? 0 : 1)).current;

  const chevronStyle = {
    transform: [{
      rotate: rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
      }),
    }],
  };

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
    const toValue = collapsed ? 1 : 0;
    Animated.timing(rotation, { toValue, duration: 260, useNativeDriver: true }).start();
    setCollapsed(prev => !prev);
  }, [collapsed, rotation]);

  const isComplete = unlockedCount === achievements.length;

  return (
    <View style={styles.groupSection}>
      {/* Cabeçalho clicável */}
      <TouchableOpacity
        style={[
          styles.groupHeader,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isComplete && { borderColor: group.color + '60' },
          Platform.OS === 'web'
            ? { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any
            : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
        ]}
        onPress={toggle}
        activeOpacity={0.75}
      >
        {/* Ícone do grupo */}
        <View style={[styles.groupIconCircle, { backgroundColor: group.color + '20' }]}>
          <MaterialCommunityIcons name={group.icon as MCIName} size={18} color={group.color} />
        </View>

        {/* Nome */}
        <Text style={[styles.groupTitle, { color: colors.text.primary }]}>{t(`achievements.groups.${group.id}`, group.label)}</Text>

        {/* Badge progresso */}
        <View style={[
          styles.groupBadge,
          { backgroundColor: isComplete ? group.color : colors.border },
        ]}>
          {isComplete && <Ionicons name="checkmark" size={11} color="#fff" style={{ marginRight: 3 }} />}
          <Text style={[
            styles.groupBadgeText,
            { color: isComplete ? '#fff' : colors.text.light },
          ]}>
            {unlockedCount}/{achievements.length}
          </Text>
        </View>

        {/* Chevron animado */}
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={18} color={colors.text.light} />
        </Animated.View>
      </TouchableOpacity>

      {/* Grid de conquistas (recolhível) */}
      {!collapsed && (
        <View style={styles.grid}>
          {achievements.map(ach => {
            const unlocked = unlockedAchievements.find(u => u.id === ach.id);
            const isUnlocked = !!unlocked;
            return (
              <View
                key={ach.id}
                style={[
                  styles.achCard,
                  { backgroundColor: colors.surface },
                  !isUnlocked && styles.achCardLocked,
                  Platform.OS === 'web'
                    ? { boxShadow: '0 2px 6px rgba(0,0,0,0.07)' } as any
                    : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
                ]}
              >
                <View style={[
                  styles.iconCircle,
                  { backgroundColor: isUnlocked ? ach.color + '22' : colors.border },
                ]}>
                  <MaterialCommunityIcons
                    name={ach.icon as MCIName}
                    size={26}
                    color={isUnlocked ? ach.color : colors.text.light}
                  />
                  {isUnlocked && (
                    <View style={[styles.checkBadge, { backgroundColor: ach.color }]}>
                      <Ionicons name="checkmark" size={9} color="#fff" />
                    </View>
                  )}
                </View>

                <Text style={[styles.achTitle, { color: isUnlocked ? colors.text.primary : colors.text.light }]}>
                  {t(`achievements.items.${ach.id}.title`, ach.title)}
                </Text>
                <Text style={[styles.achDesc, { color: colors.text.secondary }]}>
                  {t(`achievements.items.${ach.id}.desc`, ach.description)}
                </Text>
                {isUnlocked && !!unlocked.unlockedAt && (
                  <Text style={[styles.achDate, { color: colors.text.light }]}>
                    {new Date(unlocked.unlockedAt).toLocaleDateString()}
                  </Text>
                )}
                {!isUnlocked && (() => {
                  const prog = progressMap[ach.id];
                  if (prog && prog.target > 0) {
                    const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
                    return (
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.progressFill,
                              { backgroundColor: ach.color, width: `${pct}%` as any },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressLabel, { color: colors.text.light }]}>
                          {prog.current}/{prog.target}
                        </Text>
                      </View>
                    );
                  }
                  return <Text style={[styles.achLockedIcon, { color: colors.text.light }]}>🔒</Text>;
                })()}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  groupSection: { marginBottom: 12 },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  groupIconCircle: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  groupTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  groupBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10,
    marginRight: 4,
  },
  groupBadgeText: { fontSize: 11, fontWeight: '700' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  achCard: {
    width: '46%', margin: '2%',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  achCardLocked: { opacity: 0.42 },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8, position: 'relative',
  },
  checkBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  achTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  achDesc: { fontSize: 11, textAlign: 'center', lineHeight: 15, color: '#888' },
  achDate: { fontSize: 10, marginTop: 6 },
  achLockedIcon: { fontSize: 14, marginTop: 4 },
  progressContainer: { width: '100%', marginTop: 8, alignItems: 'center', gap: 3 },
  progressTrack: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 10, fontWeight: '600' },
});
