import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';

type Props = {
  streak: number;
  best: number;
};

export default function StreakBadge({ streak, best }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (streak === 0) return null;

  const isRecord = streak >= best && streak > 1;
  const color = streak >= 7 ? '#FF6B00' : streak >= 3 ? '#FF9500' : '#FFB800';

  return (
    <View style={[styles.container, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <MaterialCommunityIcons name="fire" size={18} color={color} />
      <Text style={[styles.count, { color }]}>{streak}</Text>
      <Text style={[styles.label, { color: colors.text.secondary }]}>
        {streak === 1 ? t('streak.day') : t('streak.days')}
      </Text>
      {isRecord && (
        <View style={[styles.record, { backgroundColor: color }]}>
          <Text style={styles.recordText}>{t('streak.record')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  count: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '500' },
  record: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  },
  recordText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
});
