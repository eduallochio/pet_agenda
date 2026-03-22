import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface StatCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: number | string;
  label: string;
  color?: string;
  subtitle?: string;
}

const StatCard = ({ icon, value, label, color = '#40E0D0', subtitle }: StatCardProps) => {
  const { colors } = useTheme();
  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.surface },
      Platform.OS === 'web'
        ? { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }
        : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    ]}>
      {/* Faixa colorida no topo */}
      <View style={[styles.topBar, { backgroundColor: color }]} />

      <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>

      <Text style={[styles.value, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
      {!!subtitle && (
        <Text style={[styles.subtitle, { color: color }]}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingTop: 0,
    paddingBottom: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  topBar: {
    width: '100%',
    height: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
});

export default StatCard;
