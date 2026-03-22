import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../hooks/useTheme';
import { Shadows } from '../../constants/Shadows';

interface CategoryData {
  name: string;
  count: number;
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

interface CategoryChartProps {
  title: string;
  data: CategoryData[];
  emptyMessage?: string;
}

export default function CategoryChart({ title, data, emptyMessage = 'Nenhum dado disponível' }: CategoryChartProps) {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const chartData = data.map(item => ({
    name: item.name,
    population: item.count,
    color: item.color,
    legendFontColor: colors.text.primary,
    legendFontSize: 14,
  }));

  const hasData = data.length > 0 && data.some(item => item.count > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, ...Shadows.small }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      {hasData ? (
        <>
          <PieChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
          <View style={styles.legendContainer}>
            {data.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.legendText, { color: colors.text.primary }]}>
                  {item.name}: {item.count}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>{emptyMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  legendContainer: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
