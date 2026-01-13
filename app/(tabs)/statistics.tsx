import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, Reminder, VaccineRecord } from '../../types/pet';
import { Theme, getCategoryColor } from '../../constants/Colors';
import StatCard from '../../components/charts/StatCard';
import CategoryChart from '../../components/charts/CategoryChart';
import VaccineTimeline from '../../components/charts/VaccineTimeline';

export default function StatisticsScreen() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [petsData, remindersData, vaccinesData] = await Promise.all([
        AsyncStorage.getItem('pets'),
        AsyncStorage.getItem('reminders'),
        AsyncStorage.getItem('vaccinations'),
      ]);

      setPets(petsData ? JSON.parse(petsData) : []);
      setReminders(remindersData ? JSON.parse(remindersData) : []);
      setVaccines(vaccinesData ? JSON.parse(vaccinesData) : []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Estatísticas gerais
  const totalPets = pets.length;
  const totalReminders = reminders.length;
  const totalVaccines = vaccines.length;

  // Lembretes por categoria
  const remindersByCategory = [
    {
      name: 'Saúde',
      count: reminders.filter(r => r.category === 'Saúde').length,
      color: getCategoryColor('Saúde').main,
    },
    {
      name: 'Higiene',
      count: reminders.filter(r => r.category === 'Higiene').length,
      color: getCategoryColor('Higiene').main,
    },
    {
      name: 'Consulta',
      count: reminders.filter(r => r.category === 'Consulta').length,
      color: getCategoryColor('Consulta').main,
    },
  ];

  // Pets por espécie
  const petsBySpecies = pets.reduce((acc, pet) => {
    const species = pet.species || 'Outro';
    const existing = acc.find(item => item.name === species);
    if (existing) {
      existing.count++;
    } else {
      acc.push({
        name: species,
        count: 1,
        color: getSpeciesColor(species),
      });
    }
    return acc;
  }, [] as { name: string; count: number; color: string }[]);

  // Timeline de vacinas
  const vaccineTimeline = vaccines.map(vaccine => {
    const pet = pets.find(p => p.id === vaccine.petId);
    const isUpcoming = vaccine.nextDueDate ? isDateUpcoming(vaccine.nextDueDate) : false;
    
    return {
      id: vaccine.id,
      date: vaccine.nextDueDate || vaccine.dateAdministered,
      title: vaccine.vaccineName,
      type: (vaccine.nextDueDate && isUpcoming) ? 'upcoming' as const : 'past' as const,
      petName: pet?.name || 'Pet desconhecido',
    };
  }).slice(0, 10); // Limitar a 10 eventos

  // Lembretes próximos (próximos 30 dias)
  const upcomingReminders = reminders.filter(reminder => {
    const reminderDate = parseDate(reminder.date);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return reminderDate >= now && reminderDate <= thirtyDaysFromNow;
  }).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Carregando estatísticas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Estatísticas</Text>

        {/* Cards de resumo */}
        <View style={styles.statsRow}>
          <View style={styles.statCardHalf}>
            <StatCard
              title="Total de Pets"
              value={totalPets}
              icon="paw"
              color={Theme.primary}
            />
          </View>
          <View style={styles.statCardHalf}>
            <StatCard
              title="Lembretes"
              value={totalReminders}
              icon="notifications"
              color="#FF9500"
              subtitle={`${upcomingReminders} próximos`}
            />
          </View>
        </View>

        <StatCard
          title="Total de Vacinas"
          value={totalVaccines}
          icon="medical"
          color={Theme.success}
          subtitle={`${vaccines.filter(v => v.nextDueDate).length} com reforço`}
        />

        {/* Gráfico de lembretes por categoria */}
        {totalReminders > 0 && (
          <CategoryChart
            title="Lembretes por Categoria"
            data={remindersByCategory}
            emptyMessage="Nenhum lembrete cadastrado"
          />
        )}

        {/* Gráfico de pets por espécie */}
        {totalPets > 0 && (
          <CategoryChart
            title="Pets por Espécie"
            data={petsBySpecies}
            emptyMessage="Nenhum pet cadastrado"
          />
        )}

        {/* Timeline de vacinas */}
        {totalVaccines > 0 && (
          <VaccineTimeline
            title="Timeline de Vacinas"
            events={vaccineTimeline}
          />
        )}

        {/* Mensagem quando não há dados */}
        {totalPets === 0 && totalReminders === 0 && totalVaccines === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Comece adicionando um pet para ver suas estatísticas!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Função auxiliar para parsear data DD/MM/YYYY
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Função auxiliar para verificar se data é futura
function isDateUpcoming(dateStr: string): boolean {
  const date = parseDate(dateStr);
  return date > new Date();
}

// Função auxiliar para cores das espécies
function getSpeciesColor(species: string): string {
  const colors: { [key: string]: string } = {
    'Cachorro': '#FF6B6B',
    'Gato': '#4ECDC4',
    'Pássaro': '#FFE66D',
    'Peixe': '#95E1D3',
    'Hamster': '#F38181',
    'Coelho': '#AA96DA',
  };
  return colors[species] || '#A8DADC';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.text.primary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCardHalf: {
    flex: 1,
    marginRight: 6,
  },
  loadingText: {
    fontSize: 16,
    color: Theme.text.light,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Theme.text.light,
    textAlign: 'center',
  },
});
