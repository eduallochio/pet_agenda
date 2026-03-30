import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { Shadows } from '../constants/Shadows';
import { ChallengeDef } from '../hooks/useChallenges';
import { useTranslation } from 'react-i18next';

interface ChallengeCardProps {
  challenge: ChallengeDef;
  completed: boolean;
  daysLeft: number;
}

export default function ChallengeCard({ challenge, completed, daysLeft }: ChallengeCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => { if (!completed && challenge.route) router.push(challenge.route as any); }}
      activeOpacity={completed ? 1 : 0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: challenge.color + '22' }]}>
        <MaterialCommunityIcons
          name={challenge.icon as any}
          size={18}
          color={completed ? '#888' : challenge.color}
        />
      </View>

      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: colors.text.light }]}>{t('challenge.weeklyChallenge')}</Text>
        <Text style={[styles.title, { color: completed ? colors.text.secondary : colors.text.primary }]} numberOfLines={1}>
          {challenge.title}
        </Text>
        <Text style={[styles.description, { color: colors.text.secondary }]} numberOfLines={1}>
          {challenge.description}
        </Text>
      </View>

      {completed ? (
        <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
      ) : (
        <View style={[styles.daysBadge, { backgroundColor: challenge.color + '18' }]}>
          <Text style={[styles.daysNumber, { color: challenge.color }]}>{daysLeft}</Text>
          <Text style={[styles.daysLabel, { color: challenge.color }]}>{t('challenge.days')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Shadows.small,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: { flex: 1 },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
  daysBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    minWidth: 36,
  },
  daysNumber: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  daysLabel: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
