import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { toggleVacationMode } from '../hooks/useStreak';

type Props = {
  streak: number;
  best: number;
  vacationMode?: boolean;
  onVacationToggle?: (data: import('../hooks/useStreak').StreakData) => void;
};

export default function StreakBadge({ streak, best, vacationMode, onVacationToggle }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (streak === 0 && !vacationMode) return null;

  const color = vacationMode ? '#40B0E0' : streak >= 7 ? '#FF6B00' : streak >= 3 ? '#FF9500' : '#FFB800';
  const isRecord = !vacationMode && streak >= best && streak > 1;

  const handleLongPress = () => {
    const nextMode = !vacationMode;
    Alert.alert(
      nextMode ? t('streak.vacationOn') : t('streak.vacationOff'),
      nextMode ? t('streak.vacationOnMsg') : t('streak.vacationOffMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            const updated = await toggleVacationMode();
            onVacationToggle?.(updated);
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
      style={[styles.container, { backgroundColor: color + '18', borderColor: color + '40' }]}
    >
      <MaterialCommunityIcons
        name={vacationMode ? 'beach' : 'fire'}
        size={18}
        color={color}
      />
      <Text style={[styles.count, { color }]}>{streak}</Text>
      <Text style={[styles.label, { color: colors.text.secondary }]}>
        {streak === 1 ? t('streak.day') : t('streak.days')}
      </Text>
      {vacationMode && (
        <View style={[styles.record, { backgroundColor: color }]}>
          <Text style={styles.recordText}>{t('streak.vacation')}</Text>
        </View>
      )}
      {isRecord && !vacationMode && (
        <View style={[styles.record, { backgroundColor: color }]}>
          <Text style={styles.recordText}>{t('streak.record')}</Text>
        </View>
      )}
    </TouchableOpacity>
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
