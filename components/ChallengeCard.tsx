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
      onPress={() => {
        if (!completed && challenge.route) {
          router.push(challenge.route as any);
        }
      }}
      activeOpacity={completed ? 1 : 0.8}
    >
      {/* Ícone e título */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: challenge.color + '22' }]}>
          <MaterialCommunityIcons
            name={challenge.icon as any}
            size={22}
            color={completed ? '#888' : challenge.color}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.label, { color: colors.text.light }]}>
            {t('challenge.weeklyChallenge')}
          </Text>
          <Text
            style={[styles.title, { color: completed ? colors.text.secondary : colors.text.primary }]}
            numberOfLines={1}
          >
            {challenge.title}
          </Text>
        </View>
        {completed ? (
          <View style={[styles.doneBadge, { backgroundColor: '#4CAF5022' }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
            <Text style={styles.doneText}>{t('challenge.done')}</Text>
          </View>
        ) : (
          <View style={[styles.daysBadge, { backgroundColor: challenge.color + '18' }]}>
            <Text style={[styles.daysNumber, { color: challenge.color }]}>{daysLeft}</Text>
            <Text style={[styles.daysLabel, { color: challenge.color }]}>{t('challenge.days')}</Text>
          </View>
        )}
      </View>

      {/* Descrição */}
      <Text
        style={[styles.description, { color: colors.text.secondary }]}
        numberOfLines={2}
      >
        {challenge.description}
      </Text>

      {/* Barra de progresso / CTA */}
      {!completed && (
        <View style={styles.footer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: challenge.color,
                  width: `${Math.max(0, Math.min(100, Math.round(((7 - daysLeft) / 7) * 100)))}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.ctaText, { color: challenge.color }]}>
            {t('challenge.tapToStart')} →
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  doneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  daysBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 44,
  },
  daysNumber: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  daysLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  footer: {
    gap: 6,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
});
