import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../constants/Colors';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  small?: boolean;
  style?: ViewStyle;
}

const Badge = ({ label, variant = 'default', small = false, style }: BadgeProps) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return { bg: Theme.categories.Saúde.main, text: '#FFF' };
      case 'warning':
        return { bg: Theme.categories.Consulta.main, text: '#FFF' };
      case 'danger':
        return { bg: '#F44336', text: '#FFF' };
      case 'info':
        return { bg: Theme.categories.Higiene.main, text: '#FFF' };
      default:
        return { bg: Theme.categories.Outro.main, text: '#FFF' };
    }
  };

  const colors = getVariantColors();

  return (
    <View style={[
      styles.badge,
      { backgroundColor: colors.bg },
      small && styles.badgeSmall,
      style
    ]}>
      <Text style={[
        styles.badgeText,
        { color: colors.text },
        small && styles.badgeTextSmall
      ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default Badge;
